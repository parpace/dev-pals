import { useContext, useEffect, useState } from 'react'
import Header from './Header'
import { useParams, useNavigate } from 'react-router-dom'
import profileImg from '../assets/profileImg.png'
// import LoggedInUserContext from '../LoggedInUserContext'
import axios from 'axios'
import '../component-style/profile.css'


export default function UserProfile () {
  
  const [viewedUser, setViewedUser] = useState({})
  const [activeUser, setActiveUser] = useState({})
  const [posts, setPosts] = useState([])
  const [postText, setPostText] = useState('')
  const [postComments, setPostComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [commentFormVisible, setCommentFormVisible] = useState({})
  const { username } = useParams()
  // const { loggedInUser } = useContext(LoggedInUserContext)
  const navigate = useNavigate()
  const loggedInUser = localStorage.getItem('loggedInUser')

  useEffect(() => {
    if (!loggedInUser) {
      navigate('/')
      return
    }

    const fetchData = async () => {
      try {
        const getViewedUserResponse = axios.get(`http://localhost:3001/users/usernames/${username}`)
        const getLoggedInUserResponse = axios.get(`http://localhost:3001/users/${loggedInUser}`)
        const getUserPostsResponse = axios.get(`http://localhost:3001/userPosts/${username}`)

        // Goodness gracious, the asynchronous nature of React can be such a headache. Took about 2 hours of research to find this solution of Promise.all. ChatGPT also simplified my code while helping me try to deal with this, so that's cool I guess. 
        const [viewedUserResponse, loggedInUserResponse, userPostsResponse] = await Promise.all([
          getViewedUserResponse,
          getLoggedInUserResponse,
          getUserPostsResponse
        ])

        setViewedUser(viewedUserResponse.data)
        setActiveUser(loggedInUserResponse.data)
        setPosts(userPostsResponse.data)

        userPostsResponse.data.forEach(post => {
          getPostComments(post._id)
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    if (loggedInUser) {
      fetchData()
    }
  }, [username, loggedInUser, navigate])

  
  const getPostComments = async (postId) => {
    try {
      const commentsResponse = await axios.get(`http://localhost:3001/postComments/${postId}`)
      const comments = commentsResponse.data

      // Had trouble with state here, and got a solution from ChatGPT. The problem is that I didn't need an array of comments like I thought, because each postId has comments that are assigned to it. This means that we need to hold the postId and the array of its comments as a pair in an object like this: { postId1: [{comment1}, {comment2}], postId2: [{comment1}] } Therefore, we need to make sure that each unique postId is added to the object without replacing the previous postId's.
      setPostComments(prevState => ({
        ...prevState,
        [postId]: comments
      }))
    } catch (error) {
      console.error('Error fetching post comments:', error)
    }
  }

  const createNewPost = async (content) => {
    const newPost = {
      user_id: activeUser._id, 
      content: content,
      created_at: new Date(),
      likes: 0
    }

    const response = await axios.post(`http://localhost:3001/posts`, newPost)
    setPosts([response.data.newObject, ...posts])
  }

  const handleSubmitPost = (e) => {
    e.preventDefault()
    if (!postText || postText.trim() === '') {
      alert('Please input a post before submitting')
      return
    }
    createNewPost(postText)
    setPostText('')
  }

  const handleCommentOnPost = async (postId, commentContent) => {
    // This is to avoid console errors when a comment is submitted with no value
    if (!commentContent || commentContent.trim() === '') {
      alert('Please input a comment before submitting')
      return
    }
    
    const newComment = {
      user_id: activeUser._id,
      post_id: postId,
      created_at: new Date(),
      content: commentContent,
      likes: 0
    }

    const response = await axios.post(`http://localhost:3001/comments`, newComment)
    // Needed a lot of help with state again, so had to refer to ChatGPT. This was really confusing to me, but I'm starting to understand how previous state works. The state setter function in the useState hook takes a function as an argument that automatically recieves the previous state (I named it 'prevState' here). Using a spread operator on the previous state ensures that we do not lose any existing state properties, which is important in asynchronous operations like this one. ChatGPT says "React state should be updated 'immutably'. This means we should not directly modify the existing state but instead create a new state object with the necessary updates.""
    setPostComments(prevState => ({
      ...prevState,
      // I was running into an issue of the spread operator of prevState being undefined. ChatGPT showed me hat we can use an or statement to handle that.
      [postId]: [...(prevState[postId] || []), response.data]
    }))
    setCommentText(prevState => ({
      ...prevState,
      [postId]: ''
    }))
    setCommentFormVisible(prevState => ({
      ...prevState,
      [postId]: false
    }))
  }

  const handleRemovePost = async (postId) => {
    await axios.delete(`http://localhost:3001/posts/${postId}`)
    setPosts(posts.filter(post => post._id !== postId))
  }

  const handleRemoveComment = async (commentId, postId) => {
    await axios.delete(`http://localhost:3001/comments/${commentId}`);
    setPostComments(prevState => ({
      ...prevState,
      [postId]: prevState[postId].filter(comment => comment._id !== commentId)
    }))
  }

  const handleToggleLikePost = async (postId) => {
    // console.log(activeUser._id)
    const response = await axios.put(`http://localhost:3001/users/${activeUser._id}/likes/${postId}`)
    const updatedPost = response.data

    // I need to update the local state of posts to reflect the new amount of likes
    // Had to get help with this line. I didn't realize that you could use .map insie of your setter function, so that is really helpful to know. This is now a more robust way of ensuring that we are selecting the correct post._id in our posts array, and updating it to the new status after our put request has been made.
    setPosts(posts.map(post => 
      post._id === postId ? updatedPost : post
    ))
  
    // I need to update the likedPosts of the activeUser in the local state
    if (activeUser.likedPosts.includes(postId)) {
      activeUser.likedPosts = activeUser.likedPosts.filter(id => id !== postId)
    } else {
      activeUser.likedPosts.push(postId)
    }
  }

  const handleToggleLikeComment = async (commentId) => {
    // console.log(`Liking comments will be fixed soon! You are trying to like comment with id of ${commentId}`)
    console.log(loggedInUser)
    const response = await axios.put(`http://localhost:3001/users/${loggedInUser}/likes/${commentId}`)
    const updatedComment = response.data

    setPostComments(postComments.map(comment => 
      comment._id === commentId ? updatedComment : comment
    ))

    if (activeUser.likedComments.includes(commentId)) {
      activeUser.likedComments = activeUser.likedComments.filter(id => id !== commentId)
    } else {
      activeUser.likedComments.push(commentId)
    }
  }
  
  return (
    <div className='userProfile'>
      <Header/>
      <img className="profileImage" src={profileImg} alt="Profile Image" width={200} />
      <div className='aboutUser'>
        <h2>About {viewedUser.firstname}</h2>
        <h3>{viewedUser.age} Years Old</h3>
        <h3>Lives in {viewedUser.location}</h3>
      </div>

      {/* Only show createNewPost form if viewing your own page */}
      {activeUser.username === viewedUser.username && (
        <form className='createPost' onSubmit={handleSubmitPost}>
          <input 
            type="textarea"
            value={postText} 
            onChange={(e) => setPostText(e.target.value)}
            placeholder='Write your next post here'
          />
          <button className='postButton' type='submit'>Post</button>
        </form>
      )}

      {/* Map all of the posts for the viewedUser */}
      <div className='posts'>
        {posts.map(post => (
            <div className='post' key={post._id}>
              <h4 className='postData'>{new Date(post.created_at).toLocaleString()}</h4>
              <h4 className='postContent'>{post.content}</h4>

              {/* Only show the comment form if the comment button has been clicked. Otherwise, show the comment button */}
              {commentFormVisible[post._id] ? (
                <div>
                  <input
                    type="text"
                    value={commentText[post._id] || ''}
                    onChange={(e) => setCommentText({
                      ...commentText,
                      [post._id]: e.target.value
                    })}
                    placeholder='Write a comment'
                  />
                  <button className='submitCommentButton' onClick={() => handleCommentOnPost(post._id, commentText[post._id])}>Submit Comment</button>
                  <button className='cancelCommentButton' onClick={() => setCommentFormVisible({
                    ...commentFormVisible,
                    [post._id]: false
                  })}>Cancel</button>
                </div>
              ) : (
                <button className='commentButton' onClick={() => setCommentFormVisible({
                  ...commentFormVisible,
                  [post._id]: true
                })}>Comment</button>
              )}

              <h4 className='postLikes'>Likes: {post.likes}</h4>
              <button className='likePostButton' onClick={() => handleToggleLikePost(post._id)}>Like</button>
              {/* <button className='editPostButton'>Edit</button> */}

              {/* Only show the remove post option if viewing your own post */}
              {activeUser._id === post.user_id && (
                <button className='removePostButton' onClick={() => handleRemovePost(post._id)}>Remove</button>
              )}

              {/* Map all of the comments for each post */}
              <div className='comments'>
              {postComments[post._id]?.map(comment => (
                <div className='comment' key={comment._id}>
                  {/* <img className='commentUserImg' src={comment.user_id.profilePicURL}/> */}
                  <p className='commentUsername'>{`${comment.user_id.username}`}</p>
                  <p className='commentContent'>{comment.content}</p>
                  <p className='commentData'>{new Date(comment.created_at).toLocaleString()}</p>
                  <p className='commentLikes'>Likes: {comment.likes}</p>
                  <button className='likeCommentButton' onClick={() => handleToggleLikeComment(comment._id)}>Like</button>
                  {/* <button className='editCommentButton'>Edit</button> */}

                  {/* Only show the remove comment option if it is the logged in user's comment */}
                  {comment.user_id._id === activeUser._id && (
                    <button onClick={() => handleRemoveComment(comment._id, post._id)}>Remove</button>
                  )}
                </div>
              ))}
            </div>
            </div>
          ))}
      </div>
    </div>
  )
}