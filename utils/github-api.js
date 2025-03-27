const axios = require('axios');
const dayjs = require('dayjs');

// GitHub token
const token = process.env.GITHUB_TOKEN;

// 仓库信息
const owner = process.env.OWNER || 'mifeng8901';
const repo = process.env.REPO || 'sub';

// 上传文件信息
function upload(fileContent, fileName = `${dayjs().format('MM-DD-HH-mm')}.yaml`) {

    // 将文件内容转换为 Base64 编码
    const base64Content = Buffer.from(fileContent).toString('base64');

    const year = dayjs().get('year');
    const month = dayjs().get('month') + 1;
    // GitHub API URL
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${year}/${month}/${fileName}`;

    axios.put(url, {
        message: 'Add new file',
        content: base64Content,
        // 如果是更新文件，需要提供文件的 sha 值（即文件的哈希值），
        // 这是为了告诉 GitHub 你想更新哪个文件。
        // sha: 'the_file_sha_if_updating', 
    }, {
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
        },
    })
        .then(response => {
            console.log('File uploaded successfully:', response.data);
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });
}

module.exports = {
    upload
}