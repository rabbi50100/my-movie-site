const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase এর গোপন কী সরাসরি কোডে না লিখে Environment Variable থেকে নেওয়া হচ্ছে
// এটি Netlify এর জন্য নিরাপদ এবং সঠিক পদ্ধতি
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable not set.");
}
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://my-movie-81a4b-default-rtdb.firebaseio.com" // আপনার আসল ডেটাবেস URL দিন
});

const db = admin.database();
const moviesRef = db.ref('movies');

const outputDir = path.join(__dirname, 'movie');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

function createSlug(title) {
    return title ? title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : '';
}

async function generateMoviePages() {
    try {
        const template = fs.readFileSync(path.join(__dirname, 'movie.html'), 'utf-8');
        const snapshot = await moviesRef.once('value');
        const movies = snapshot.val();

        for (const key in movies) {
            const movie = movies[key];
            if (!movie.title) continue;
            
            const slug = createSlug(movie.title);
            let pageHtml = template;

            pageHtml = pageHtml.replace(/__MOVIE_TITLE__/g, movie.title || 'N/A');
            pageHtml = pageHtml.replace(/__MOVIE_DESCRIPTION__/g, (movie.description || 'No description').replace(/"/g, '"'));
            pageHtml = pageHtml.replace(/__MOVIE_IMAGE__/g, movie.image || '');
            pageHtml = pageHtml.replace(/__MOVIE_SLUG__/g, slug);
            pageHtml = pageHtml.replace(/__YOUR_SITE_URL__/g, process.env.URL || 'your-site.netlify.app');

            let buttonsHTML = '';
            if (movie.link) buttonsHTML += `<a href="${movie.link}" target="_blank">▶️ Watch Now</a>`;
            if (movie.link2) buttonsHTML += `<a href="${movie.link2}" target="_blank">Download 720p</a>`;
            if (movie.link3) buttonsHTML += `<a href="${movie.link3}" target="_blank">Download 360p</a>`;
            pageHtml = pageHtml.replace('__DOWNLOAD_BUTTONS__', buttonsHTML);

            fs.writeFileSync(path.join(outputDir, `${slug}.html`), pageHtml);
            console.log(`Created page for: ${movie.title}`);
        }
        // একটি মূল index.html ফাইল movie ফোল্ডারের ভেতরে তৈরি করা হচ্ছে
        fs.writeFileSync(path.join(outputDir, 'index.html'), `<h1>Welcome!</h1><p>Redirecting to homepage...</p><meta http-equiv="refresh" content="0;url=${process.env.URL || '/'}" />`);
        
        console.log('All movie pages generated successfully!');
    } catch (error) {
        console.error('Error generating pages:', error);
        process.exit(1);
    }
}

generateMoviePages();
