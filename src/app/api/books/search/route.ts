import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
        return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
    }

    try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20${apiKey ? `&key=${apiKey}` : ''}`
        
        const res = await fetch(googleUrl)
        
        if (res.status === 429 || !res.ok) {
            // Fallback to OpenLibrary API if Google Books is rate limited or fails
            const olRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`)
            if (!olRes.ok) throw new Error('Trop de requêtes ou erreur lors de la recherche sur les deux bases.')
            
            const olData = await olRes.json()
            if (olData.docs) {
                const mappedResults = olData.docs.map((doc: any) => ({
                    id: doc.key,
                    volumeInfo: {
                        title: doc.title,
                        authors: doc.author_name,
                        description: doc.first_publish_year ? `Première publication en ${doc.first_publish_year}` : '',
                        imageLinks: {
                            thumbnail: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined
                        },
                        industryIdentifiers: doc.isbn ? doc.isbn.map((isbn: string) => ({
                            type: isbn.length === 13 ? 'ISBN_13' : 'ISBN_10',
                            identifier: isbn
                        })) : [],
                        language: doc.language ? doc.language[0] : undefined
                    }
                }))
                return NextResponse.json({ items: mappedResults, source: 'OpenLibrary' })
            } else {
                return NextResponse.json({ items: [], source: 'OpenLibrary' })
            }
        }
        
        const data = await res.json()
        if (data.items) {
            return NextResponse.json({ items: data.items, source: 'Google Books' })
        } else {
            return NextResponse.json({ items: [], source: 'Google Books' })
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Impossible de récupérer les résultats depuis Google Books ou OpenLibrary.' }, { status: 500 })
    }
}
