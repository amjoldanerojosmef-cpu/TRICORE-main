<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if ($path !== '/api/login') {
    return false;
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$supabaseUrl = rtrim((string) getenv('SUPABASE_URL'), '/');
$supabaseAnonKey = (string) getenv('SUPABASE_ANON_KEY');

if ($supabaseUrl === '' || $supabaseAnonKey === '') {
    http_response_code(500);
    echo json_encode(['error' => 'The server is missing its Supabase configuration.']);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
$email = is_array($input) ? trim((string) ($input['email'] ?? '')) : '';
$password = is_array($input) ? (string) ($input['password'] ?? '') : '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Enter a valid email address and password.']);
    exit;
}

$curl = curl_init($supabaseUrl . '/auth/v1/token?grant_type=password');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode(['email' => $email, 'password' => $password]),
    CURLOPT_HTTPHEADER => [
        'apikey: ' . $supabaseAnonKey,
        'Content-Type: application/json',
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
]);

$responseBody = curl_exec($curl);
$statusCode = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$curlError = curl_error($curl);
curl_close($curl);

if ($responseBody === false) {
    error_log('Supabase sign-in request failed: ' . $curlError);
    http_response_code(502);
    echo json_encode(['error' => 'Could not reach the authentication service.']);
    exit;
}

$session = json_decode($responseBody, true);

if ($statusCode < 200 || $statusCode >= 300 || !is_array($session)) {
    http_response_code($statusCode >= 400 && $statusCode < 500 ? $statusCode : 502);
    echo json_encode(['error' => $session['msg'] ?? $session['message'] ?? 'Sign-in failed.']);
    exit;
}

session_set_cookie_params([
    'httponly' => true,
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
    'path' => '/',
]);
session_start();
session_regenerate_id(true);
$_SESSION['supabase_access_token'] = $session['access_token'];
$_SESSION['supabase_refresh_token'] = $session['refresh_token'] ?? null;
$_SESSION['supabase_user'] = $session['user'] ?? null;

echo json_encode([
    'user' => [
        'id' => $session['user']['id'] ?? null,
        'email' => $session['user']['email'] ?? $email,
    ],
]);
