# PHP API

Upload `api/reservations.php` to a PHP host with PHP 8.1+, PDO, and `pdo_mysql` enabled. Configure these server environment variables in the hosting control panel:

```text
DB_HOST=your-public-mysql-host
DB_PORT=3306
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=sorta_taxi
```

Run `db/schema.sql` on that MySQL server. Upload the entire `php` directory as the PHP document root, including `.htaccess`. The endpoint will be:

```text
https://your-php-domain.com/api/reservations.php
```

The React client uses clean `/api/reservations` paths, which `.htaccess` rewrites to the PHP file.

Set Netlify's `VITE_API_URL` to `https://your-php-domain.com` and redeploy the React site. CORS is enabled for the initial setup; restrict `Access-Control-Allow-Origin` to your Netlify domain before production use.