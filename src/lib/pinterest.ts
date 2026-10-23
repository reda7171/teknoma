import axios from 'axios';

/**
 * Publie une image sur Pinterest via l'API v5.
 * Priorité : base64 (accessible sans URL publique) > image_url
 */
export async function publishPin(
    imageUrl: string,
    title: string,
    description: string,
    link: string,
    boardId: string,
    accessToken: string,
    imageBase64?: string // data:image/... ou base64 pur
) {
    const url = 'https://api.pinterest.com/v5/pins';

    // Extraire le base64 pur si fourni avec prefix data:image
    let base64Data: string | null = null
    if (imageBase64) {
        const match = imageBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
        base64Data = match ? match[2] : imageBase64
    }

    const mediaSource = base64Data
        ? { source_type: 'image_base64', data: base64Data }
        : { source_type: 'image_url', url: imageUrl }

    const data = {
        board_id: boardId,
        title: title.substring(0, 100),
        description: description.substring(0, 500),
        link: link,
        media_source: mediaSource
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
        const errMsg = error.response?.data?.message || error.message || 'Erreur Pinterest';
        console.error('Erreur Pinterest API:', error.response?.data || error.message);
        // Si image_base64 échoue, ne pas retenter avec URL (risque du même pb)
        throw new Error(errMsg);
    }
}
