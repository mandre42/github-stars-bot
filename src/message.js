/*
 * message.js
 * This file contains your bot code
 */

const axios = require('axios')
const recastai = require('recastai')

// This function is the core of the bot behaviour
const replyMessage = (message) => {
  // Instantiate Recast.AI SDK, just for request service
  const request = new recastai.request(process.env.REQUEST_TOKEN, process.env.LANGUAGE)
  // Get text from message received
  const text = message.content

  console.log('I receive: ', text)

  // Get senderId to catch unique conversation_token
  const senderId = message.senderId

  // Call Recast.AI SDK, through /converse route
  request.converseText(text, { conversationToken: senderId })
  .then(async result => {
    /*
    * YOUR OWN CODE
    * Here, you can add your own process.
    * Ex: You can call any external API
    * Or: Update your mongo DB
    * etc...
    */
    if (result.action) {
      console.log('The conversation action is: ', result.action.slug)
    }

    // If there is not any message return by Recast.AI for this current conversation
    if (result.replies.length) {
      // Add each reply received from API to replies stack
      result.replies.forEach(replyContent => message.addReply({ type: 'text', content: replyContent }))
    } else if (result.action && result.action.slug === 'stars') {
      const product = result.get('product')

      if (product && product.value) {
        // Project detected by NER
        console.log('Product detected' + product.value)

        try {
          const response = await axios({
            method: 'get',
            url: `https://api.github.com/search/repositories?q=${product.value}`,
          })

          if (response.data && response.data.items && response.data.items.length > 0) {
            const project = response.data.items[0]
            const stars = project.stargazers_count || 0
            const name = project.name
            const url = project.html_url

            const buttons = [
              {
                title: 'Check the repository',
                type: 'web_url', // See Facebook Messenger button formats
                value: url,
              },
            ]

            if (project.homepage.length > 0) {
              buttons.push({
                title: 'Check homepage',
                type: 'web_url', // See Facebook Messenger button formats
                value: project.homepage,
              })
            }
            // message.addReply({ type: 'text', content: `The project ${name} (${url}) has ${stars} star${stars > 1 ? 's' : '' }` })
            message.addReply({
              type: 'card',
              content: {
                title: `${name}: ${stars} star${stars > 1 ? 's' : '' }`,
                subtitle: `${name} was made by ${project.owner.login}`,
                imageUrl: project.owner.avatar_url,
                buttons,
              },
            })
          } else {
            throw new Error('Project not found')
          }
        } catch (e) {
          message.addReply({ type: 'text', content: 'I can not find this project. Just try again differently :)' })
        }
      } else {
        // Project not deteted by NER
        message.addReply({ type: 'text', content: 'Just ask me "How many stars does the project angular have ?"' })
      }
    } else {
      message.addReply({ type: 'text', content: 'I don\'t have the reply to this yet :)' })
    }

    // Send all replies
    message.reply()
    .then(() => {
      // Do some code after sending messages
    })
    .catch(err => {
      console.error('Error while sending message to channel', err)
    })
  })
  .catch(err => {
    console.error('Error while sending message to Recast.AI', err)
  })
}

module.exports = replyMessage
