function GoogleDriveMark() {
  return (
    <svg viewBox="0 0 87.3 78" width="26" height="24" role="img" aria-label="Google Drive">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  )
}

function DropboxMark() {
  return (
    <svg viewBox="0 0 43 40" width="25" height="24" role="img" aria-label="Dropbox">
      <path d="M12.6 0 0 8.03l8.71 6.98L21.4 7.13zM0 21.98l12.6 8.03 8.8-7.34-12.69-7.66zm21.4.69 8.8 7.34L42.8 21.98l-8.71-6.97zM42.8 8.03 30.2 0l-8.8 7.13 12.69 7.88zM21.43 24.29l-8.83 7.32-3.78-2.47v2.77L21.43 40l12.61-8.09v-2.77l-3.78 2.47z" fill="#0061FF" />
    </svg>
  )
}

export function StorageLogos() {
  return (
    <div className="storage-logos">
      <span className="storage-logo"><GoogleDriveMark /> Google Drive</span>
      <span className="storage-logo"><DropboxMark /> Dropbox</span>
    </div>
  )
}
