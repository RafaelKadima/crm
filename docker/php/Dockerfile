FROM php:8.2-fpm

# Instala extensões essenciais para Laravel + imagens
RUN apt-get update && apt-get install -y \
    git unzip libpq-dev libzip-dev libpng-dev libjpeg-dev libfreetype6-dev ffmpeg \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_pgsql zip gd pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis

# Instalar composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/crm
