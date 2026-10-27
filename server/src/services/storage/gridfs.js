import mongoose from 'mongoose';
// Uploaded media lives in MongoDB GridFS, so no external storage account is needed.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
export async function getFileBuffer(id) {
  const chunks = [];
  for await (const chunk of bucket().openDownloadStream(new mongoose.Types.ObjectId(id)))
    chunks.push(chunk);
  return Buffer.concat(chunks);
}
export async function deleteFile(id) {
  await bucket().delete(new mongoose.Types.ObjectId(id));
}
// Multer storage engine: streams each uploaded file into GridFS and exposes file.key/file.size.
export function gridfsStorage() {
  return {
    _handleFile(req, file, cb) {
      const upload = bucket().openUploadStream(file.originalname, {
        metadata: { userId: req.user.id, contentType: file.mimetype },
      });
      file.stream
        .pipe(upload)
        .on('error', cb)
        .on('finish', () => cb(null, { key: String(upload.id), size: upload.length }));
    },
    _removeFile(_req, file, cb) {
      deleteFile(file.key).then(() => cb(null), cb);
    },
  };
}
