import { Disk } from 'flydrive'
import { S3Driver } from 'flydrive/drivers/s3'

export const s3Disk = new Disk(
    new S3Driver({
        credentials: {
            accessKeyId:process.env.AWS_ACCESS_KEY as string,
            secretAccessKey: process.env.AWS_ACCESS_SECRET as string,
        },
        region: process.env.AWS_REGION as string,
        bucket: process.env.AWS_BUCKET as string,
        visibility: 'private',
    })
)