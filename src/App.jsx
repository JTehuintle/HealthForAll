import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [showLanguageList, setShowLanguageList] = useState(false)
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
        </main>
      </div>
    </div>
  )
}

export default App

