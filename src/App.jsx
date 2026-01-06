import { useState, useRef } from 'react'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const fileInputRef = useRef(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = () => {
    if (selectedFile) {
      console.log('Submitting file:', selectedFile.name)
      // Add your submit logic here
    } else {
      alert('Please select a file first')
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="hamburger-menu">
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
          </div>
          <div className="dark-mode-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
        <div className="sidebar-bottom-circle"></div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h1 className="header-title">Your health translator</h1>
          </div>
          <div className="header-right">
            <div className="header-circle"></div>
            <span className="header-name">Name</span>
          </div>
        </header>

        {/* Content */}
        <main className="content-area">
          <div className="upload-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt"
            />
            <button className="upload-button" onClick={handleUploadClick}>
              {selectedFile ? selectedFile.name : 'Upload doc'}
            </button>
            <button className="submit-button" onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

