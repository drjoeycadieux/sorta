import cors from 'cors'
import express from 'express'
import mysql from 'mysql2/promise'

const app = express()
const port = process.env.PORT || 3001
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sorta_taxi',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10
})
let databaseAvailable = true
let memoryReservations = []
let nextMemoryId = 1

app.use(cors())
app.use(express.json())

const fields = 'id, customer_name AS customerName, customer_phone AS customerPhone, pickup, destination, ride_date AS rideDate, ride_time AS rideTime, vehicle, status, notes, created_at AS createdAt'

app.get('/', (_request, response) => response.redirect('http://localhost:5173/'))
app.get('/api/health', (_request, response) => response.json({ ok: true }))

app.get('/api/reservations', async (_request, response) => {
  try {
    const [rows] = await pool.query(`SELECT ${fields} FROM reservations ORDER BY ride_date ASC, ride_time ASC`)
    databaseAvailable = true
    response.json(rows)
  } catch (error) {
    databaseAvailable = false
    response.json(memoryReservations)
  }
})

app.post('/api/reservations', async (request, response) => {
  try {
    const reservation = request.body
    const [result] = await pool.execute(
      'INSERT INTO reservations (customer_name, customer_phone, pickup, destination, ride_date, ride_time, vehicle, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [reservation.customerName, reservation.customerPhone, reservation.pickup, reservation.destination, reservation.rideDate, reservation.rideTime, reservation.vehicle, reservation.status || 'upcoming', reservation.notes || null]
    )
    const [rows] = await pool.query(`SELECT ${fields} FROM reservations WHERE id = ?`, [result.insertId])
    response.status(201).json(rows[0])
  } catch (error) {
    databaseAvailable = false
    const created = { id: nextMemoryId++, ...request.body, status: request.body.status || 'upcoming', createdAt: new Date().toISOString() }
    memoryReservations = [...memoryReservations, created]
    response.status(201).json(created)
  }
})

app.put('/api/reservations/:id', async (request, response) => {
  try {
    const reservation = request.body
    await pool.execute(
      'UPDATE reservations SET customer_name = ?, customer_phone = ?, pickup = ?, destination = ?, ride_date = ?, ride_time = ?, vehicle = ?, status = ?, notes = ? WHERE id = ?',
      [reservation.customerName, reservation.customerPhone, reservation.pickup, reservation.destination, reservation.rideDate, reservation.rideTime, reservation.vehicle, reservation.status, reservation.notes || null, request.params.id]
    )
    const [rows] = await pool.query(`SELECT ${fields} FROM reservations WHERE id = ?`, [request.params.id])
    response.json(rows[0])
  } catch (error) {
    databaseAvailable = false
    const index = memoryReservations.findIndex((item) => item.id === Number(request.params.id))
    if (index === -1) return response.status(404).json({ error: 'Reservation not found.' })
    const updated = { ...memoryReservations[index], ...request.body, id: Number(request.params.id) }
    memoryReservations[index] = updated
    response.json(updated)
  }
})

app.patch('/api/reservations/:id/cancel', async (request, response) => {
  try {
    await pool.execute("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [request.params.id])
    response.json({ ok: true })
  } catch (error) {
    databaseAvailable = false
    const index = memoryReservations.findIndex((item) => item.id === Number(request.params.id))
    if (index === -1) return response.status(404).json({ error: 'Reservation not found.' })
    memoryReservations[index] = { ...memoryReservations[index], status: 'cancelled' }
    response.json({ ok: true })
  }
})

app.delete('/api/reservations/:id', async (request, response) => {
  try {
    await pool.execute('DELETE FROM reservations WHERE id = ?', [request.params.id])
    response.status(204).end()
  } catch (error) {
    databaseAvailable = false
    memoryReservations = memoryReservations.filter((item) => item.id !== Number(request.params.id))
    response.status(204).end()
  }
})

app.listen(port, () => console.log(`API listening on http://localhost:${port}`))