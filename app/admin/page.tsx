'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import APP_CONFIG, { getChurchName, getPageTitle } from '@/lib/config'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const router = useRouter()

  useEffect(() => {
    document.title = getPageTitle('Admin Tools')
    checkUser()
    generateQRCode()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    setUser(user)
  }

  const generateQRCode = () => {
    const baseUrl = window.location.origin
    const prayerFormUrl = `${baseUrl}/request`
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(prayerFormUrl)}`
    setQrCodeUrl(qrUrl)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${APP_CONFIG.churchName.toLowerCase().replace(/\s+/g, '-')}-prayer-qr-code.png`
    link.click()
  }

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${getChurchName.short()} - Prayer Request QR Code</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 40px;
              }
              h1 {
                color: #1f2937;
                margin-bottom: 10px;
              }
              h2 {
                color: #6b7280;
                font-weight: normal;
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
            <h1>${getChurchName.short()}</h1>
            <h2>Submit a Prayer Request</h2>
            <p>Scan this QR code with your phone camera</p>
            <img src="${qrCodeUrl}" alt="Prayer Request QR Code" />
            <div class="footer">
              <p>${window.location.origin}/request</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Tools</h1>
            <p className="text-sm text-slate-600">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-xl border-2 border-slate-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">
              Prayer Request QR Code
            </h2>
            <p className="text-slate-600">
              Print this QR code and place it around your church. People can scan it to submit prayer requests instantly!
            </p>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center mb-8">
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-slate-200">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Prayer Request QR Code" 
                  className="w-80 h-80"
                />
              ) : (
                <div className="w-80 h-80 flex items-center justify-center bg-slate-100 rounded">
                  <p className="text-slate-500">Generating QR Code...</p>
                </div>
              )}
            </div>
          </div>

          {/* URL Display */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border-2 border-blue-100">
            <p className="text-sm text-slate-600 mb-2 font-semibold">QR Code links to:</p>
            <p className="text-blue-600 font-mono text-sm break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/request` : ''} 
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download QR Code</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-3 bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print QR Code</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-12 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 text-lg">How to Use:</h3>
            <ol className="space-y-3 text-slate-700">
              <li className="flex gap-3">
                <span className="font-bold text-slate-500 flex-shrink-0">1.</span>
                <span>Click &quot;Download QR Code&quot; or &quot;Print QR Code&quot;</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-slate-500 flex-shrink-0">2.</span>
                <div>
                  <p>Place the printed QR code in visible locations:</p>
                  <ul className="ml-6 mt-2 space-y-1 text-sm text-slate-600">
                    <li>• Church entrance</li>
                    <li>• Prayer room</li>
                    <li>• Bulletin boards</li>
                    <li>• Sunday bulletin (print version)</li>
                    <li>• Church website/social media</li>
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-slate-500 flex-shrink-0">3.</span>
                <span>People scan with phone camera → Opens prayer form automatically</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-slate-500 flex-shrink-0">4.</span>
                <span>They submit → Prayer warriors get notified</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/leader"
            className="block p-6 bg-white rounded-xl shadow border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg transition text-center"
          >
            <svg className="w-12 h-12 mx-auto mb-2 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <div className="font-semibold text-slate-800 text-lg">Leader Dashboard</div>
            <div className="text-sm text-slate-600 mt-1">Manage all prayers</div>
          </a>
          <a    
            href="/insights"
            className="block p-6 bg-white rounded-xl shadow border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg transition text-center"
          >
            <svg className="w-12 h-12 mx-auto mb-2 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="font-semibold text-slate-800 text-lg">AI Insights</div>
            <div className="text-sm text-slate-600 mt-1">Prayer trends & analysis</div>
          </a>
        </div>
      </div>
    </div>
  )
}