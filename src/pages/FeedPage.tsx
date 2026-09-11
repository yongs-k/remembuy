import { useState } from 'react'
import { useLocker } from '../state/LockerContext'
import { FEED_POSTS } from '../data/feedData'
import { RatingStars } from '../components/RatingStars'

export default function FeedPage() {
  const { addItem } = useLocker()
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  function handleSave(post: (typeof FEED_POSTS)[number]) {
    addItem({
      id: `feed-saved-${post.id}-${Date.now()}`,
      name: post.itemName,
      locationId: post.locationId,
      categoryId: post.categoryId,
      rating: post.rating,
      note: `${post.nickname}님 추천: ${post.comment}`,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    setSavedIds((prev) => new Set(prev).add(post.id))
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">공유 피드</h1>
      <ul className="space-y-3">
        {FEED_POSTS.map((post) => (
          <li key={post.id} className="rounded-lg border border-ink/10 bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink/50">{post.nickname}</p>
              <RatingStars rating={post.rating} />
            </div>
            <p className="font-medium">{post.itemName}</p>
            <p className="text-sm">{post.comment}</p>
            <button
              type="button"
              disabled={savedIds.has(post.id)}
              onClick={() => handleSave(post)}
              className="mt-2 rounded-full bg-stamp px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {savedIds.has(post.id) ? '저장됨' : '저장하기'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
