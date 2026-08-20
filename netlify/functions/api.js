import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'sorta_taxi',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 3
})

const fields = 'id, customer_name AS customerName, customer_phone AS customerPhone, pickup, destination, ride_date AS rideDate, ride_time AS rideTime, vehicle, status, notes, created_at AS createdAt'

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) }
}

function requestBody(event) {
  try { return JSON.parse(event.body || '{}') } catch { return {} }
}

export async function handler(event) {
  const path = event.path.replace(/^.*?\/api\/?/, '/').replace(/\/$/, '') || '/'
  const method = event.httpMethod

  try {
    if (method === 'GET' && path === '/health') {
      await pool.query('SELECT 1')
      return response(200, { ok: true, database: 'mysql' })
    }

    if (method === 'GET' && path === '/reservations') {
      const [rows] = await pool.query(`SELECT ${fields} FROM reservations ORDER BY ride_date ASC, ride_time ASC`)
      return response(200, rows)
    }

    const idMatch = path.match(/^\/reservations\/(\d+)$/)
    const cancelMatch = path.match(/^\/reservations\/(\d+)\/cancel$/)

    if (method === 'POST' && path === '/reservations') {
      const reservation = requestBody(event)
      const [result] = await pool.execute(
        'INSERT INTO reservations (customer_name, customer_phone, pickup, destination, ride_date, ride_time, vehicle, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [reservation.customerName, reservation.customerPhone, reservation.pickup, reservation.destination, reservation.rideDate, reservation.rideTime, reservation.vehicle, reservation.status || 'upcoming', reservation.notes || null]
      )
      const [rows] = await pool.query(`SELECT ${fields} FROM reservations WHERE id = ?`, [result.insertId])
      return response(201, rows[0])
    }

    if (method === 'PUT' && idMatch) {
      const reservation = requestBody(event)
      await pool.execute(
        'UPDATE reservations SET customer_name = ?, customer_phone = ?, pickup = ?, destination = ?, ride_date = ?, ride_time = ?, vehicle = ?, status = ?, notes = ? WHERE id = ?',
        [reservation.customerName, reservation.customerPhone, reservation.pickup, reservation.destination, reservation.rideDate, reservation.rideTime, reservation.vehicle, reservation.status, reservation.notes || null, idMatch[1]]
      )
      const [rows] = await pool.query(`SELECT ${fields} FROM reservations WHERE id = ?`, [idMatch[1]])
      return response(200, rows[0])
    }

    if (method === 'PATCH' && cancelMatch) {
      await pool.execute("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [cancelMatch[1]])
      return response(200, { ok: true })
    }

    if (method === 'DELETE' && idMatch) {
      await pool.execute('DELETE FROM reservations WHERE id = ?', [idMatch[1]])
      return response(204)
    }

    return response(404, { error: 'Route not found.' })
  } catch (error) {
    console.error('Reservation API error:', error)
    return response(500, { error: 'Database request failed.' })
  }
}