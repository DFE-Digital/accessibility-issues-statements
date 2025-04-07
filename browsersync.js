const browserSync = require('browser-sync');

const proxyPort = 3066;  

browserSync.init({
    proxy: `http://localhost:${proxyPort}`,  // Proxy your Express app
    files: [
        'app/views/**/*.html',
        'app/public/**/*.{css,js}',
        'app/routes.js'
    ],
    port: 4000,  // BrowserSync port
    open: false,  // Set to true to open the browser automatically
    notify: false
});

console.log('BrowserSync is running...');
