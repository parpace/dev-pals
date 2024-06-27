
    
//ASYNC versions, if using mongoose
const {User, Post, Comment} = require('../models'); //with models/index.js file
//const User = require('../models/User'); //without models/index.js file

//Read
const getAllUsers = async (req, res) => {
    try {
        const objectArray = await User.find()
        res.json(objectArray)
    } catch (error) {
        return res.status(500).send(error.message);
    }
}

//Read
const getUserById = async (req, res) => {
    try {
        const { id } = req.params
        const singleObject = await User.findById(id)
        if (singleObject) {
            return res.json(singleObject)
        }
        return res.status(404).send(`that User doesn't exist`)
    } catch (error) {
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).send(`That User doesn't exist`)
        }
        return res.status(500).send(error.message);
    }
}

const getFriendsByUserId = async (req, res) => {
    try {
        const { id } = req.params
        const singleObject = await User.findById(id).populate('friendsList')
        if (singleObject) {
            return res.json(singleObject)
        }
        return res.status(404).send(`That user doesn't exist`)
    } catch (error) {
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).send(`That user doesn't exist`)
        }
        return res.status(500).send(error.message)
    }
}

const getUserByUsername = async (req, res) => {
    const { username } = req.params
    const regex = new RegExp(username, 'i');
    try {
        const singleObject = await User.findOne({username: { $regex: regex }})
        if (singleObject) {
            return res.json(singleObject)
        }
        return res.status(404).send(`that User doesn't exist`)
    } catch (error) {
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).send(`That User doesn't exist`)
        }
        return res.status(500).send(error.message);
    }
}

const getUserIdByUsername = async (req, res) => {
    const { username } = req.params
    try {
        const user = await User.findOne({ username: username })
        if (user) {
            return res.json({ _id: user._id })
        }
        return res.status(404).send('User not found')
    } catch (error) {
        return res.status(500).send(error.message)
    }
}

//create
const createUser = async (req, res) => {
    try {
        const newObject = await new User(req.body)
        await newObject.save()
        return res.status(201).json({
            newObject,
        });
    } catch (error) {
        // if (error.name === 'CastError' && error.kind === 'ObjectId') {
        //     return res.status(404).send(`That User doesn't exist`)
        // }
        return res.status(500).json({ error: error.message })
    }
}

//update
const updateUser = async (req, res) => {
    try {
        let { id } = req.params;
        let changedObject = await User.findByIdAndUpdate(id, req.body, { new: true })
        if (changedObject) {
            return res.status(200).json(changedObject)
        }
        throw new Error("User not found and can't be updated")
    } catch (error) {
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).send(`That User doesn't exist`)
        }
        return res.status(500).send(error.message);
    }
}

//delete
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const erasedObject = await User.findByIdAndDelete(id)
        if (erasedObject) {
            return res.status(200).send("User deleted");
        }
        throw new Error("User not found and can't be deleted");
    } catch (error) {
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(404).send(`That User doesn't exist`)
        }
        return res.status(500).send(error.message);
    }
}

const toggleLikePost = async (req, res) => {
    try {
        const { userId, postId } = req.params

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        const post = await Post.findById(postId)
        if (!post) {
            return res.status(404).json({ error: 'Post not found' })
        }

        // Was trying to do this a much more complicated way with .find, and asked ChatGpt how it would handle this request. It gave me this includes method which is so nice and simple. includes is a JavaScript array method that checks if a certain value exists in an array. It returns true if the value exists in the array and false otherwise
        const hasLiked = user.likedPosts.includes(postId)

        if (hasLiked) {
            user.likedPosts.pull(postId)
            post.likes -= 1
        } else {
            user.likedPosts.push(postId)
            post.likes += 1
        }

        await user.save()
        await post.save()

        res.status(200).json(post)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const toggleLikeComment = async (req, res) => {
    try {
        const { userId, commentId } = req.params
        // console.log(`userId: ${userId}, commentId: ${commentId}`)
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        const comment = await Comment.findById(commentId)
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' })
        }

        const hasLiked = user.likedComments.includes(commentId)

        if (hasLiked) {
            user.likedComments.pull(commentId)
            comment.likes -= 1
        } else {
            user.likedComments.push(commentId)
            comment.likes += 1
        }

        await user.save()
        await comment.save()

        res.status(200).json({comment})
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const addFriend = async (req, res) => {
    try {
        const { loggedInUser, userId } = req.params

        const user = await User.findById(loggedInUser)

        if (!user) {
            return res.status(404).send('Logged in user not found')
        }

        if (!user.friendsList.includes(userId)) {
            user.friendsList.push(userId)
            await user.save()
        }

        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).send(error.message)
    }
}

// const sendFriendRequest = async (req,res) => {
//     try {
//         const { loggedInUser, requestedUser } = req.params

//         const loggedIn = await User.findById(loggedInUser)
//         const requested = await User.findById(requestedUser)

//         if (!loggedIn) {
//             return res.status(404).send('Logged in user not found')
//         }

//         if (!requested) {
//             return res.status(404).send('Requested user not found')
//         }

//         if (!loggedIn.friendsList.includes(requested)) {
//             requested.friendRequests.push(loggedIn)
//             await requested.save()
//         }

//         return res.status(200).json(requested)
//     } catch (error) {
//         return res.status(500).send(error.message)
//     }
// }

module.exports = {
    getAllUsers, 
    getUserById, 
    createUser, 
    updateUser, 
    deleteUser,
    toggleLikePost,
    toggleLikeComment,
    getUserByUsername,
    getUserIdByUsername,
    getFriendsByUserId,
    addFriend,
    // sendFriendRequest
}