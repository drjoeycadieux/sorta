<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function envValue(string $name, string $fallback = ''): string
{
    $value = getenv($name);
    return $value === false ? $fallback : $value;
}

function respond(int $status, mixed $payload = null): never
{
    http_response_code($status);
    if ($payload !== null) echo json_encode($payload);
    exit;
}

try {
    $database = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', envValue('DB_HOST'), envValue('DB_PORT', '3306'), envValue('DB_NAME', 'sorta_taxi')),
        envValue('DB_USER'),
        envValue('DB_PASSWORD'),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (Throwable $error) {
    error_log($error->getMessage());
    respond(500, ['error' => 'Could not connect to MySQL.']);
}

$fields = 'id, customer_name AS customerName, customer_phone AS customerPhone, pickup, destination, ride_date AS rideDate, ride_time AS rideTime, vehicle, status, notes, created_at AS createdAt';
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
if ($id === null && preg_match('#/reservations/(\d+)#', $path, $matches)) $id = (int) $matches[1];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    if ($method === 'GET') {
        $statement = $database->query("SELECT {$fields} FROM reservations ORDER BY ride_date ASC, ride_time ASC");
        respond(200, $statement->fetchAll());
    }

    if ($method === 'POST') {
        $statement = $database->prepare('INSERT INTO reservations (customer_name, customer_phone, pickup, destination, ride_date, ride_time, vehicle, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$body['customerName'], $body['customerPhone'], $body['pickup'], $body['destination'], $body['rideDate'], $body['rideTime'], $body['vehicle'] ?? 'Standard', $body['status'] ?? 'upcoming', $body['notes'] ?? null]);
        $newId = (int) $database->lastInsertId();
        $statement = $database->prepare("SELECT {$fields} FROM reservations WHERE id = ?");
        $statement->execute([$newId]);
        respond(201, $statement->fetch());
    }

    if ($id === null) respond(400, ['error' => 'A reservation id is required.']);

    if ($method === 'PUT') {
        $statement = $database->prepare('UPDATE reservations SET customer_name = ?, customer_phone = ?, pickup = ?, destination = ?, ride_date = ?, ride_time = ?, vehicle = ?, status = ?, notes = ? WHERE id = ?');
        $statement->execute([$body['customerName'], $body['customerPhone'], $body['pickup'], $body['destination'], $body['rideDate'], $body['rideTime'], $body['vehicle'], $body['status'], $body['notes'] ?? null, $id]);
        $statement = $database->prepare("SELECT {$fields} FROM reservations WHERE id = ?");
        $statement->execute([$id]);
        respond(200, $statement->fetch());
    }

    if ($method === 'PATCH' && (str_ends_with($path, '/cancel') || ($_GET['action'] ?? '') === 'cancel')) {
        $statement = $database->prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?");
        $statement->execute([$id]);
        respond(200, ['ok' => true]);
    }

    if ($method === 'DELETE') {
        $statement = $database->prepare('DELETE FROM reservations WHERE id = ?');
        $statement->execute([$id]);
        respond(204);
    }

    respond(405, ['error' => 'Method not allowed.']);
} catch (Throwable $error) {
    error_log($error->getMessage());
    respond(500, ['error' => 'Database request failed.']);
}