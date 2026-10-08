export default function GoogleReviewsBadge() {
  return (
    <a
      href="https://www.google.com/maps/place/Riwaya/@34.0151156,-6.8506771,17z/data=!3m1!4b1!4m6!3m5!1s0xda76d9be04b2cdb:0xb283e75db60f9d37!8m2!3d34.0151156!4d-6.8506771!16s%2Fg%2F11ywgnhfxt"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consulter les avis clients Riwaya sur Google"
      className="fixed left-3 bottom-[84px] md:bottom-3 z-50 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-lg transition-transform hover:-translate-y-0.5"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-black shadow-sm ring-1 ring-gray-100"
      >
        <span className="text-blue-600">G</span>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-bold">Avis clients</span>
        <span className="text-xs font-black text-blue-600">Voir sur Google</span>
      </span>
    </a>
  )
}
