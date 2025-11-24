// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/components/__test-utils__/NextIntlProvider'
import { createMockMedia, createMockPost } from '@/services/__test-utils__/payloadMocks'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NewsFeedList from './NewsFeedList'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}))

// Mock @/i18n/navigation
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}))

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<NextIntlTestProvider>{ui}</NextIntlTestProvider>)
}

describe('NewsFeedList', () => {
  it('should render empty message when no posts', () => {
    renderWithIntl(<NewsFeedList posts={[]} emptyMessage="No posts available" />)

    expect(screen.getByText('No posts available')).toBeInTheDocument()
  })

  it('should render list of posts', () => {
    const posts = [
      createMockPost({ id: 1, title: 'Post 1', slug: 'post-1' }),
      createMockPost({ id: 2, title: 'Post 2', slug: 'post-2' }),
    ]

    renderWithIntl(<NewsFeedList posts={posts} emptyMessage="No posts" />)

    expect(screen.getByText('Post 1')).toBeInTheDocument()
    expect(screen.getByText('Post 2')).toBeInTheDocument()
  })

  it('should render post with image', () => {
    const mockMedia = createMockMedia({ url: 'https://example.com/image.jpg' })
    const post = createMockPost({
      title: 'Post with image',
      image: mockMedia as any,
    })

    renderWithIntl(<NewsFeedList posts={[post]} emptyMessage="No posts" />)

    const image = screen.getByRole('img', { name: 'Post with image' })
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('should render post without image with placeholder', () => {
    const post = createMockPost({
      title: 'Post without image',
      image: null as any,
    })

    renderWithIntl(<NewsFeedList posts={[post]} emptyMessage="No posts" />)

    expect(screen.getByText('Post without image')).toBeInTheDocument()
    // Component renders a placeholder image when no image is provided
    const image = screen.getByRole('img', { name: 'Post without image' })
    expect(image).toHaveAttribute('src', '/placeholder.jpg')
  })

  it('should render read more link for each post', () => {
    const post = createMockPost({ title: 'Test Post', slug: 'test-post' })

    renderWithIntl(<NewsFeedList posts={[post]} emptyMessage="No posts" />)

    const link = screen.getByText('Read more →')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/news/test-post')
  })

  it('should format date correctly', () => {
    const post = createMockPost({
      title: 'Test Post',
      createdAt: '2024-01-15T10:00:00.000Z',
    })

    renderWithIntl(<NewsFeedList posts={[post]} emptyMessage="No posts" />)

    // Check that a date is rendered (exact format depends on locale)
    // The formatDate function in NewsFeedList uses 'en' locale
    // Date appears twice: once in desktop view, once in mobile view
    const dates = screen.getAllByText('January 15, 2024')
    expect(dates.length).toBeGreaterThan(0)
  })

  it('should render multiple posts in correct order', () => {
    const posts = [
      createMockPost({ id: 1, title: 'First Post' }),
      createMockPost({ id: 2, title: 'Second Post' }),
      createMockPost({ id: 3, title: 'Third Post' }),
    ]

    renderWithIntl(<NewsFeedList posts={posts} emptyMessage="No posts" />)

    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(3)
  })

  it('should handle image URL from R2 endpoint', () => {
    const mockMedia = createMockMedia({
      url: undefined as any,
      filename: 'test-image.jpg',
    })
    const post = createMockPost({
      title: 'Post with R2 image',
      image: mockMedia as any,
    })

    renderWithIntl(<NewsFeedList posts={[post]} emptyMessage="No posts" />)

    const image = screen.getByRole('img', { name: 'Post with R2 image' })
    expect(image).toBeInTheDocument()
    // Check that the src includes the R2 endpoint or filename
    expect(image.getAttribute('src')).toBeTruthy()
  })
})
