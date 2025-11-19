export default function JsonLd() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Literary Showcase',
        url: process.env.NEXTAUTH_URL || 'https://literaryshowcase.com',
        description: 'Discover and curate literary content.',
        potentialAction: {
            '@type': 'SearchAction',
            target: `${process.env.NEXTAUTH_URL || 'https://literaryshowcase.com'}/?search={search_term_string}`,
            'query-input': 'required name=search_term_string'
        }
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
