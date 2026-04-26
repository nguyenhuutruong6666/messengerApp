const CLOUD_NAME = 'dbtxqph5h';
const UPLOAD_PRESET = 'messta_unsigned';

export const uploadImageToCloudinary = (imageUri, folder = 'chat') => {
    return new Promise((resolve, reject) => {
        const filename = imageUri.split('/').pop() || `img_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

        const formData = new FormData();
        formData.append('file', {
            uri: imageUri,
            name: filename,
            type,
        });
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', folder);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err.error?.message || `Upload thất bại: ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload thất bại: ${xhr.status}`));
                }
            }
        };

        xhr.onerror = () => reject(new Error('Lỗi mạng khi upload ảnh'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));
        xhr.timeout = 30000;

        xhr.send(formData);
    });
};
