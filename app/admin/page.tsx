'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkUser()
    generateQRCode()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
  }

  const generateQRCode = () => {
    // Get the current URL
    const baseUrl = window.location.origin
    const prayerFormUrl = `${baseUrl}/`
    
    // Use a free QR code API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(prayerFormUrl)}`
    setQrCodeUrl(qrUrl)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = 'church-prayer-qr-code.png'
    link.click()
  }

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Prayer Request QR Code</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 40px;
              }
              h1 {
                color: #1f2937;
                margin-bottom: 20px;
              }
              p {
                color: #6b7280;
                margin-bottom: 30px;
              }
              img {
                border: 10px solid #fff;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .footer {
                margin-top: 30px;
                font-size: 14px;
                color: #9ca3af;
              }
            </style>
          </head>
          <body>
            <h1>🙏 Submit a Prayer Request</h1>
            <p>Scan this QR code with your phone camera</p>
            <img src="${qrCodeUrl}" alt="Prayer Request QR Code" />
            <div class="footer">
              <p>${window.location.origin}</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">⚙️ Admin Tools</h1>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Prayer Request QR Code
            </h2>
            <p className="text-gray-600">
              Print this QR code and place it around your church. People can scan it to submit prayer requests instantly!
            </p>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center mb-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Prayer Request QR Code" 
                  className="w-80 h-80"
                />
              ) : (
                <div className="w-80 h-80 flex items-center justify-center bg-gray-100 rounded">
                  <p className="text-gray-500">Generating QR Code...</p>
                </div>
              )}
            </div>
          </div>

          {/* URL Display */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">QR Code links to:</p>
            <p className="text-blue-600 font-mono text-sm break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              <span>📥 Download QR Code</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              <span>🖨️ Print QR Code</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-12 p-6 bg-gray-50 rounded-xl">
            <h3 className="font-bold text-gray-800 mb-4">📋 How to Use:</h3>
            <ol className="space-y-2 text-gray-700">
              <li>1. Click &quot;Download QR Code&quot; or &quot;Print QR Code&quot;</li>
              <li>2. Place the printed QR code in visible locations:
                <ul className="ml-6 mt-2 space-y-1 text-sm text-gray-600">
                  <li>• Church entrance</li>
                  <li>• Prayer room</li>
                  <li>• Bulletin boards</li>
                  <li>• Sunday bulletin (print version)</li>
                  <li>• Church website/social media</li>
                </ul>
              </li>
              <li>3. People scan with phone camera → Opens prayer form automatically</li>
              <li>4. They submit → Prayer warriors get notified</li>
            </ol>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/leader"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition text-center"
          >
            <div className="text-4xl mb-2">👨‍💼</div>
            <div className="font-semibold text-gray-800">Leader Dashboard</div>
            <div className="text-sm text-gray-600 mt-1">Manage all prayers</div>
          </a>
          <a    
            href="/warrior"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition text-center"
          >
            <div className="text-4xl mb-2">🙏</div>
            <div className="font-semibold text-gray-800">Warrior Dashboard</div>
            <div className="text-sm text-gray-600 mt-1">View and pray</div>
          </a>
          <a    
            href="/basonta"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-lg transition text-center"
          >
            <div className="text-4xl mb-2">🎵</div>
            <div className="font-semibold text-gray-800">Basonta Dashboard</div>
            <div className="text-sm text-gray-600 mt-1">Manage groups</div>
          </a>
        </div>
      </div>
    </div>
  )
}