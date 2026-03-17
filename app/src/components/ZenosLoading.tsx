import { useState } from 'react'

const ZEN_QUOTES = [
  { original: '七転び八起き', translation: 'Fall seven times, stand up eight.' },
  { original: '千里之行，始於足下', translation: 'A journey of a thousand miles begins with a single step.' },
  { original: '一期一会', translation: 'One time, one meeting — treasure every encounter.' },
  { original: '温故知新', translation: 'Study the old to understand the new.' },
  { original: '点滴穿石', translation: 'Constant dripping wears away stone.' },
  { original: '初心忘るべからず', translation: 'Never forget the beginner\'s mind.' },
]

export default function ZenosLoading() {
  const [quote] = useState(() => ZEN_QUOTES[Math.floor(Math.random() * ZEN_QUOTES.length)])
  return (
    <div className="zenos-loading">
      <img src="/assets/zenos_logo.png" alt="ZenOS" className="zenos-loading__logo" />
      <div className="zenos-loading__quote">
        <p className="zenos-loading__quote-jp">{quote.original}</p>
        <p className="zenos-loading__quote-en">{quote.translation}</p>
      </div>
      <div className="zenos-loading__dots">
        <span className="zenos-loading__dot" />
        <span className="zenos-loading__dot" />
        <span className="zenos-loading__dot" />
      </div>
    </div>
  )
}
