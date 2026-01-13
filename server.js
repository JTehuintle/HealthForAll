import express from 'express'
import multer from 'multer'
import axios from 'axios'
import { GoogleGenerativeAI } from '@google/generative-ai'
import cors from 'cors'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true })
}

// LlamaParse API configuration - from environment variables
const LLAMAPARSE_API_KEY = process.env.LLAMAPARSE_API_KEY
// LlamaParse API endpoints - try v1 API first
const LLAMAPARSE_API_URL = 'https://api.cloud.llamaindex.ai/api/v1/parsing/upload'
const LLAMAPARSE_BASE_URL = 'https://api.cloud.llamaindex.ai'

// Google Gemini API configuration - from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// Validate that API keys are set
if (!LLAMAPARSE_API_KEY) {
  console.error('ERROR: LLAMAPARSE_API_KEY is not set in environment variables')
  process.exit(1)
}

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in environment variables')
  process.exit(1)
}

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Language mapping for Gemini
const languageMap = {
  'English': 'English',
  'Spanish': 'Spanish',
  'Chinese (Mandarin)': 'Chinese (Mandarin)',
  'Tagalog': 'Tagalog',
  'Vietnamese': 'Vietnamese',
  'Arabic': 'Arabic',
  'French': 'French',
  'Korean': 'Korean',
  'Russian': 'Russian',
  'German': 'German',
  'Hindi': 'Hindi',
  'Portuguese': 'Portuguese',
  'Italian': 'Italian',
  'Japanese': 'Japanese',
  'Urdu': 'Urdu',
  'Polish': 'Polish',
  'Persian': 'Persian',
  'Turkish': 'Turkish',
  'Greek': 'Greek',
  'Hebrew': 'Hebrew'
}

// Helper function to read text files directly
function readTextFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf-8')
      console.log('Read text file directly, length:', content.length)
      return content
    }
    return null
  } catch (error) {
    console.error('Error reading text file:', error)
    return null
  }
}

// Upload and parse document with LlamaParse
async function parseDocumentWithLlamaParse(filePath) {
  try {
    // For .txt files, try reading directly first as a fallback
    const textContent = readTextFile(filePath)
    if (textContent) {
      console.log('Read text file directly, length:', textContent.length)
      return textContent
    }
    
    console.log('Uploading file to LlamaParse...', filePath)
    
    const formData = new FormData()
    const fileStream = fs.createReadStream(filePath)
    const fileName = path.basename(filePath)
    const fileStats = fs.statSync(filePath)
    
    formData.append('file', fileStream, {
      filename: fileName,
      contentType: 'application/octet-stream',
      knownLength: fileStats.size
    })

    const response = await axios.post(LLAMAPARSE_API_URL, formData, {
      headers: {
        'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000 // 60 second timeout
    }).catch(error => {
      console.error('LlamaParse upload error:', error.response?.data || error.message)
      throw error
    })

    console.log('LlamaParse upload response:', response.data)

    // LlamaParse returns a job ID, we need to poll for results
    const jobId = response.data.id || response.data.job_id
    
    if (!jobId) {
      throw new Error('No job ID returned from LlamaParse. Response: ' + JSON.stringify(response.data))
    }
    
    console.log('LlamaParse job ID:', jobId)
    
    // Poll for the parsed result
    let parsedText = ''
    let attempts = 0
    const maxAttempts = 60 // 60 attempts with 2 second intervals = 120 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
      
      try {
        // Try getting status - try both v1 and non-versioned endpoints
        let statusResponse
        try {
          statusResponse = await axios.get(
            `${LLAMAPARSE_BASE_URL}/api/v1/parsing/job/${jobId}`,
            {
              headers: {
                'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
                'Accept': 'application/json'
              },
              timeout: 10000
            }
          )
        } catch (v1Error) {
          // Fallback to non-versioned endpoint
          statusResponse = await axios.get(
            `${LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}`,
            {
              headers: {
                'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
                'Accept': 'application/json'
              },
              timeout: 10000
            }
          )
        }
        
        console.log(`Poll attempt ${attempts + 1}: Status:`, statusResponse.data.status)
        console.log('Status response data:', JSON.stringify(statusResponse.data, null, 2))
        
        if (statusResponse.data.status === 'success' || statusResponse.data.status === 'SUCCESS') {
          // Small delay to ensure result is ready
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Check if result is already in the status response
          let documentData = statusResponse.data
          
          // Log the full status response to debug (truncated for large responses)
          const statusStr = JSON.stringify(statusResponse.data, null, 2)
          console.log('Full status response (first 2000 chars):', statusStr.substring(0, 2000))
          
          // Check if result data is in the response
          const hasResult = documentData.markdown || documentData.text || documentData.content || 
                           documentData.result || documentData.data || documentData.parsed_content
          
          if (!hasResult) {
            // Try different result endpoint variations
            // LlamaParse API might use different endpoint structure
            const resultEndpoints = [
              `${LLAMAPARSE_BASE_URL}/api/v1/parsing/job/${jobId}/result`,
              `${LLAMAPARSE_BASE_URL}/api/v1/parsing/job/${jobId}/download`,
              `${LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}/result`,
              `${LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}/download`,
              `${LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}/content`,
              `${LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}/parsed`
            ]
            
            let foundResult = false
            for (const endpoint of resultEndpoints) {
              try {
                console.log(`Trying endpoint: ${endpoint}`)
                const documentResponse = await axios.get(endpoint, {
                  headers: {
                    'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
                    'Accept': 'application/json'
                  },
                  timeout: 30000
                })
                documentData = documentResponse.data
                console.log(`Successfully got result from: ${endpoint}`)
                console.log('Result keys:', Object.keys(documentData))
                foundResult = true
                break
              } catch (endpointError) {
                const status = endpointError.response?.status
                const errorData = endpointError.response?.data
                console.log(`Endpoint ${endpoint} failed:`, status, errorData || endpointError.message)
                // If it's a 404, the endpoint doesn't exist - try next one
                // If it's another error, might be worth retrying
                continue
              }
            }
            
            if (!foundResult) {
              // Try one more time with a fresh status check that might include the result
              try {
                console.log('Trying fresh status check with result...')
                const freshStatus = await axios.get(
                  `${LLAMAPARSE_BASE_URL}/api/v1/parsing/job/${jobId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
                      'Accept': 'application/json'
                    },
                    timeout: 10000
                  }
                )
                console.log('Fresh status response:', JSON.stringify(freshStatus.data, null, 2).substring(0, 1000))
                documentData = freshStatus.data
              } catch (freshError) {
                // Try non-versioned endpoint
                try {
                  const freshStatus2 = await axios.get(
                    `${LLAMAPARSE_BASE_URL}/api/parsing/job/${jobId}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
                        'Accept': 'application/json'
                      },
                      timeout: 10000
                    }
                  )
                  documentData = freshStatus2.data
                } catch (freshError2) {
                  console.log('Fresh status check also failed')
                  documentData = statusResponse.data
                }
              }
            }
          }
          
          console.log('Document data structure:', Object.keys(documentData))
          console.log('Document data sample:', JSON.stringify(documentData).substring(0, 500))
          
          // Extract text from the parsed document - try multiple possible formats
          if (documentData.markdown) {
            parsedText = documentData.markdown
          } else if (documentData.text) {
            parsedText = documentData.text
          } else if (documentData.content) {
            parsedText = documentData.content
          } else if (documentData.parsed_content) {
            parsedText = documentData.parsed_content
          } else if (documentData.result) {
            // Result might be an object or string
            if (typeof documentData.result === 'string') {
              parsedText = documentData.result
            } else if (documentData.result.markdown) {
              parsedText = documentData.result.markdown
            } else if (documentData.result.text) {
              parsedText = documentData.result.text
            } else if (documentData.result.content) {
              parsedText = documentData.result.content
            }
          } else if (documentData.data) {
            if (typeof documentData.data === 'string') {
              parsedText = documentData.data
            } else if (documentData.data.markdown) {
              parsedText = documentData.data.markdown
            } else if (documentData.data.text) {
              parsedText = documentData.data.text
            }
          } else if (documentData.document) {
            if (typeof documentData.document === 'string') {
              parsedText = documentData.document
            } else if (documentData.document.markdown) {
              parsedText = documentData.document.markdown
            } else if (documentData.document.text) {
              parsedText = documentData.document.text
            }
          } else if (typeof documentData === 'string') {
            parsedText = documentData
          } else {
            // Last resort: try to find any string value in the object
            const findTextInObject = (obj) => {
              for (const key in obj) {
                if (typeof obj[key] === 'string' && obj[key].length > 100) {
                  return obj[key]
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                  const found = findTextInObject(obj[key])
                  if (found) return found
                }
              }
              return null
            }
            parsedText = findTextInObject(documentData) || JSON.stringify(documentData, null, 2)
            if (parsedText === JSON.stringify(documentData, null, 2)) {
              console.warn('Unexpected response format, using JSON string')
            }
          }
          
          if (parsedText) {
            console.log('Successfully extracted text, length:', parsedText.length)
            break
          } else {
            console.warn('Status is SUCCESS but no text extracted. Full response:', JSON.stringify(documentData, null, 2))
          }
        } else if (statusResponse.data.status === 'error' || statusResponse.data.status === 'ERROR') {
          const errorMsg = statusResponse.data.error || statusResponse.data.message || 'LlamaParse parsing failed'
          throw new Error(`LlamaParse parsing failed: ${errorMsg}`)
        } else if (statusResponse.data.status === 'pending' || statusResponse.data.status === 'PENDING') {
          // Continue polling
        } else {
          console.log('Unknown status:', statusResponse.data.status)
        }
      } catch (pollError) {
        console.error('Error polling status:', pollError.message)
        // Continue polling unless it's a clear error
        if (pollError.response?.status === 404) {
          throw new Error('LlamaParse job not found. The job may have expired.')
        }
      }
      
      attempts++
    }
    
    if (!parsedText && attempts >= maxAttempts) {
      throw new Error('LlamaParse parsing timed out after 2 minutes')
    }
    
    if (!parsedText) {
      throw new Error('No text extracted from document')
    }
    
    return parsedText
  } catch (error) {
    console.error('LlamaParse error details:')
    console.error('Error message:', error.message)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)
    
    let errorMessage = 'Failed to parse document with LlamaParse'
    if (error.response?.data) {
      errorMessage += `: ${JSON.stringify(error.response.data)}`
    } else if (error.message) {
      errorMessage += `: ${error.message}`
    }
    
    throw new Error(errorMessage)
  }
}

// Summarize text with Google Gemini
async function summarizeWithGemini(text, targetLanguage) {
  try {
    const prompt = `Please summarize the following health document in ${targetLanguage}. 
    Provide a clear, comprehensive summary that includes:
    1. Main health information and findings
    2. Important recommendations or instructions
    3. Any critical details that the patient should know
    
    Document content:
    ${text}
    
    Please provide the summary in ${targetLanguage}.`

    // Try using the SDK first with different model names
    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
    let summary = null
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying Gemini model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const response = await result.response
        summary = response.text()
        console.log(`Successfully used model: ${modelName}`)
        break
      } catch (modelError) {
        console.log(`Model ${modelName} failed:`, modelError.message)
        // If it's a 404, try next model
        if (modelError.message.includes('404') || modelError.message.includes('not found')) {
          continue
        }
        // If it's another error, throw it
        throw modelError
      }
    }
    
    if (!summary) {
      // Fallback: Try using REST API directly
      console.log('SDK models failed, trying REST API directly...')
      const restResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (restResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        summary = restResponse.data.candidates[0].content.parts[0].text
        console.log('Successfully used REST API')
      } else {
        throw new Error('Failed to get response from Gemini API')
      }
    }
    
    return summary
  } catch (error) {
    console.error('Gemini error:', error.message)
    console.error('Gemini error details:', error.response?.data || error)
    throw error
  }
}

// Main API endpoint
app.post('/api/process-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { language } = req.body
    if (!language) {
      return res.status(400).json({ error: 'Language not specified' })
    }

    const filePath = req.file.path
    const targetLanguage = languageMap[language] || language

    // Step 1: Parse document with LlamaParse
    console.log('Parsing document with LlamaParse...')
    let parsedText
    try {
      parsedText = await parseDocumentWithLlamaParse(filePath)
    } catch (parseError) {
      console.error('LlamaParse failed, error:', parseError.message)
      
      // Check if it's a text file - we can read it directly
      const textContent = readTextFile(filePath)
      if (textContent) {
        console.log('Using direct text file reading as fallback')
        parsedText = textContent
      } else {
        // For non-text files, return error with helpful message
        return res.status(500).json({ 
          error: 'Failed to parse document with LlamaParse',
          message: parseError.message,
          suggestion: 'LlamaParse API may be experiencing issues. Try again in a moment, or use a .txt file for direct processing.'
        })
      }
    }

    if (!parsedText || parsedText.trim().length === 0) {
      return res.status(500).json({ 
        error: 'Failed to parse document',
        message: 'No text content extracted from the document'
      })
    }
    
    console.log('Successfully parsed document, text length:', parsedText.length)

    // Step 2: Summarize with Gemini
    console.log('Summarizing with Gemini...')
    const summary = await summarizeWithGemini(parsedText, targetLanguage)

    // Clean up uploaded file
    fs.unlinkSync(filePath)

    // Return the summary
    res.json({
      success: true,
      summary: summary,
      originalLanguage: 'English', // Assuming documents are in English
      targetLanguage: targetLanguage
    })
  } catch (error) {
    console.error('Error processing document:', error)
    console.error('Error stack:', error.stack)
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError)
      }
    }
    
    const errorMessage = error.message || 'Unknown error occurred'
    console.error('Returning error to client:', errorMessage)
    
    res.status(500).json({ 
      error: 'Failed to process document',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    geminiConfigured: !!GEMINI_API_KEY,
    llamaparseConfigured: !!LLAMAPARSE_API_KEY,
    server: 'running'
  })
})

// Test endpoint to verify server connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('✓ Gemini API configured')
  console.log('✓ LlamaParse API configured')
  console.log('✓ API keys loaded from environment variables (secure)')
})

