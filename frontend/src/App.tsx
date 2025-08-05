import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import DraftAssistant from './pages/DraftAssistant'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/draft-assistant" replace />} />
          <Route path="/draft-assistant" element={<DraftAssistant />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
