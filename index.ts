import { Kafka, logLevel } from "kafkajs";
import { s3Disk } from "./lib/s3_disk.ts";
import sql from "./lib/sql.ts";

type Message = {
	certificateId: string;
};

const broker = process.env.BROKER;

const kafka = new Kafka({
	brokers: [`${broker}`],
	clientId: "certificate-upload",
	logLevel: logLevel.ERROR,
});

const consumer = kafka.consumer({ groupId: "uploader-1" });

const run = async () => {
	await consumer.connect();
	console.log("Success connect");
	await consumer.subscribe({
		topic: `${process.env.TOPIC}`,
		fromBeginning: true,
	});

	console.log("Success subscribe");

	await consumer.run({
		eachMessage: async ({ message }) => {
			if (message.value) {
				let messageJson = message.value.toString();
				let uploadMessage = JSON.parse(messageJson) as Message;
				console.log(`Get message for ${uploadMessage.certificateId}`);
				let image = await fetch(
					`http://localhost:3000/api/certificate/${uploadMessage.certificateId}/image`,
				);
				if (image.status !== 200) {
					throw new Error("Failed to fetch image");
				}
				let imageArr = await image.arrayBuffer();
				let imageFile = Buffer.from(imageArr);
				let pdf = await fetch(
					`http://localhost:3000/api/certificate/${uploadMessage.certificateId}/pdf`,
				);
				if (pdf.status !== 200) {
					throw new Error("Failed to fetch pdf");
				}
				let pdfArr = await pdf.arrayBuffer();
				let pdfFile = Buffer.from(pdfArr);
				let pdfKey = `certificate/${uploadMessage.certificateId}/${uploadMessage.certificateId}.pdf`;
				let jpegKey = `certificate/${uploadMessage.certificateId}/${uploadMessage.certificateId}.jpeg`;
				await s3Disk.put(pdfKey, pdfFile);
				console.log(`Successfully uploaded pdf file`);
				await s3Disk.put(jpegKey, imageFile);
				console.log(`Successfully uploaded jpf file`);
				await sql`UPDATE generated_certificates SET is_uploaded=true WHERE id=${uploadMessage.certificateId}`;
				console.log(`Success upload and update ${uploadMessage.certificateId}`);
			}
		},
	});
};

run().catch((e) => console.error("[uploader-1/consumer] e.message", e));
