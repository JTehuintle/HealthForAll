import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [showLanguageList, setShowLanguageList] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const languageSectionRef = useRef(null)

  // Close language list when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        languageSectionRef.current &&
        !languageSectionRef.current.contains(event.target)
      ) {
        setShowLanguageList(false)
      }
    }

    if (showLanguageList) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLanguageList])

  // Common languages in the US
  const languages = [
    'English',
    'Spanish',
    'Chinese (Mandarin)',
    'Tagalog',
    'Vietnamese',
    'Arabic',
    'French',
    'Korean',
    'Russian',
    'German',
    'Hindi',
    'Portuguese',
    'Italian',
    'Japanese',
    'Urdu',
    'Polish',
    'Persian',
    'Turkish',
    'Greek',
    'Hebrew'
  ]

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    if (!selectedLanguage) {
      setError('Please select a language first')
      return
    }

    setIsLoading(true)
    setError(null)
    setSummary(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('language', selectedLanguage)

      const response = await fetch('http://localhost:3001/api/process-document', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        let errorMessage = 'Failed to process document'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (err) {
      let errorMessage = err.message || 'An error occurred while processing the document'
      
      // Handle network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Please make sure the server is running on http://localhost:3001'
      }
      
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language)
    setShowLanguageList(false)
  }

  const handleChooseClick = () => {
    setShowLanguageList(!showLanguageList)
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
          <div className="content-wrapper">
            {/* Left Side - Upload and Language Controls */}
            <div className="left-controls">
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
                <button 
                  className="submit-button" 
                  onClick={handleSubmit}
                  disabled={isLoading || !selectedFile || !selectedLanguage}
                >
                  {isLoading ? 'Processing...' : 'Submit'}
                </button>
              </div>
              <div className="language-section" ref={languageSectionRef}>
                <p className="language-question">Language to translate to?</p>
                <button className="choose-button" onClick={handleChooseClick}>
                  choose
                </button>
                {selectedLanguage && (
                  <div className="selected-language">
                    {selectedLanguage}
                  </div>
                )}
                {showLanguageList && (
                  <div className="language-list">
                    {languages.map((language) => (
                      <button
                        key={language}
                        className="language-option"
                        onClick={() => handleLanguageSelect(language)}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Results Text Box */}
            <div className="results-section">
              {isLoading && (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Processing your document...</p>
                  <p className="loading-subtext">This may take a minute</p>
                </div>
              )}
              
              {error && (
                <div className="error-container">
                  <p className="error-text">Error: {error}</p>
                </div>
              )}
              
              {summary && !isLoading && (
                <div className="summary-textbox">
                  <h2 className="summary-title">Summary ({selectedLanguage})</h2>
                  <textarea 
                    className="summary-textarea"
                    value={summary}
                    readOnly
                    placeholder="The translated summary will appear here..."
                  />
                </div>
              )}
              
              {!summary && !isLoading && !error && (
                <div className="summary-textbox summary-textbox-empty">
                  <h2 className="summary-title">Summary</h2>
                  <textarea 
                    className="summary-textarea"
                    value=""
                    readOnly
                    placeholder="Upload a document and select a language to see the translated summary here..."
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

