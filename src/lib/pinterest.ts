import axios from 'axios';

export async function publishPin(imageUrl: string, title: string, description: string, link: string, boardId: string, accessToken: string) {
    const url = 'https://api.pinterest.com/v5/pins';
    
    const data = {
        board_id: boardId,
        title: title.substring(0, 100),
        description: description.substring(0, 500),
        link: link,
        media_source: {
            source_type: 'image_url',
            url: imageUrl
        }
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error: any) {
        console.error('Erreur Pinterest API:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Erreur lors de la publication sur Pinterest');
    }
}
