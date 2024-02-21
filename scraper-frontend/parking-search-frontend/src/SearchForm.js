import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import './SearchForm.css';
import moment from 'moment';

function SearchForm() {
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [promoCode, setPromoCode] = useState('');
  const [airport, setAirport] = useState('');
  const [duration, setDuration] = useState('');

  const airports = [
    { label: "Choose Airport", value: "" },
    { label: "Luton", value: "Luton" },
    { label: "Manchester", value: "Manchester" },
    { label: "Heathrow", value: "Heathrow" },
    { label: "Gatwick", value: "Gatwick" },
    { label: "Stansted", value: "Stansted" },
    { label: "Birmingham", value: "Birmingham" },
    { label: "Bristol", value: "Bristol" },
    { label: "Liverpool", value: "Liverpool" },
    { label: "Edinburgh", value: "Edinburgh" },
    { label: "Glasgow", value: "Glasgow" },
    { label: "Newcastle", value: "Newcastle" },
    { label: "Leeds", value: "Leeds" },
    { label: "East Midlands", value: "East Midlands" },
    { label: "Southampton", value: "Southampton" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        promoCode,
        airport,
        duration,
    };

    // Replace this URL with your backend endpoint
    const apiUrl = 'http://localhost:3000/scrape';

    try {
      const response = await axios.post(apiUrl, data);
      console.log(response.data);
      // Handle response data
    } catch (error) {
      console.error("Error submitting form:", error);
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
  <div className="form-group">
    <label>From Date:</label>
    <DatePicker selected={fromDate} onChange={date => setFromDate(date)} className="date-picker" />
  </div>
  <div className="form-group">
    <label>To Date:</label>
    <DatePicker selected={toDate} onChange={date => setToDate(date)} className="date-picker" />
  </div>
  <div className="form-group">
    <label>Promo Code:</label>
    <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
  </div>
  <div className="form-group">
    <label>Airport:</label>
    <select value={airport} onChange={e => setAirport(e.target.value)}>
      {airports.map(airport => (
        <option key={airport.value} value={airport.value}>{airport.label}</option>
      ))}
    </select>
  </div>
  <div className="form-group">
    <label>Duration:</label>
    <input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
  </div>
  <div>
    <button type="submit">Search</button>
  </div>
</form>

  );
}

export default SearchForm;
