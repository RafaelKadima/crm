<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

        /*
        |--------------------------------------------------------------------------
        | Media Disk - For Chat Attachments
        |--------------------------------------------------------------------------
        |
        | Disk for storing chat media files (images, videos, documents).
        | Compatible with S3, Cloudflare R2, MinIO, or local storage.
        |
        | For S3/R2/MinIO, set MEDIA_DISK=s3 and configure:
        |   MEDIA_AWS_ACCESS_KEY_ID, MEDIA_AWS_SECRET_ACCESS_KEY,
        |   MEDIA_AWS_DEFAULT_REGION, MEDIA_AWS_BUCKET, MEDIA_AWS_ENDPOINT
        |
        | For local development, set MEDIA_DISK=media_local
        |
        */
        'media' => [
            'driver' => env('MEDIA_DISK_DRIVER', 's3'),
            'key' => env('MEDIA_AWS_ACCESS_KEY_ID', env('AWS_ACCESS_KEY_ID')),
            'secret' => env('MEDIA_AWS_SECRET_ACCESS_KEY', env('AWS_SECRET_ACCESS_KEY')),
            'region' => env('MEDIA_AWS_DEFAULT_REGION', env('AWS_DEFAULT_REGION', 'us-east-1')),
            'bucket' => env('MEDIA_AWS_BUCKET', env('AWS_BUCKET')),
            'url' => env('MEDIA_AWS_URL', env('AWS_URL')),
            'endpoint' => env('MEDIA_AWS_ENDPOINT', env('AWS_ENDPOINT')),
            'use_path_style_endpoint' => env('MEDIA_AWS_USE_PATH_STYLE_ENDPOINT', env('AWS_USE_PATH_STYLE_ENDPOINT', false)),
            'throw' => false,
            'report' => false,
            'visibility' => 'private',
        ],

        'media_local' => [
            'driver' => 'local',
            'root' => storage_path('app/media'),
            'url' => env('APP_URL').'/storage/media',
            'visibility' => 'private',
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
