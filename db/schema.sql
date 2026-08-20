CREATE DATABASE IF NOT EXISTS sorta_taxi;
USE sorta_taxi;

CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  pickup VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  ride_date DATE NOT NULL,
  ride_time TIME NOT NULL,
  vehicle ENUM('Standard', 'Executive', 'Van') NOT NULL DEFAULT 'Standard',
  status ENUM('upcoming', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ride_schedule (ride_date, ride_time),
  INDEX idx_status (status)
);