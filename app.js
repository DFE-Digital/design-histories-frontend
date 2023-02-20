// Core dependencies
const path = require('path')

// External dependencies
const browserSync = require('browser-sync')
const compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const highlightjs = require('highlight.js')
const nunjucks = require('nunjucks')
const markdown = require('nunjucks-markdown')
const marked = require('marked')

const sessionInCookie = require('client-sessions')
const sessionInMemory = require('express-session')

// Local dependencies
const authentication = require('./middleware/authentication')
const config = require('./app/config')
const fileHelper = require('./middleware/file-helper')
const locals = require('./app/locals')
const routing = require('./middleware/routing')
const PageIndex = require('./middleware/page-index')
const { getRandomValues } = require('crypto')
const axios = require('axios')
const dateFilter = require('nunjucks-date-filter')

const dotenv = require('dotenv')

dotenv.config()

const pageIndex = new PageIndex(config)

// Initialise applications
const app = express()

// Authentication middleware
app.use(authentication)

// Use local variables
app.use(locals(config))

// Use gzip compression to decrease the size of
// the response body and increase the speed of web app
app.use(compression())

// Use helmet to help secure the application
// by setting http headers
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
)

var useCookieSessionStore =
  process.env.USE_COOKIE_SESSION_STORE || config.useCookieSessionStore

const sessionName =
  'dfeuk-' + Buffer.from('design-history', 'utf8').toString('hex')
const sessionOptions = {
  secret: sessionName,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: true,
  },
}

// Support session data in cookie or memory

app.use(
  sessionInMemory(
    Object.assign(sessionOptions, {
      name: sessionName,
      resave: false,
      saveUninitialized: false,
    }),
  ),
)

// Middleware to serve static assets
app.use(express.static(path.join(__dirname, 'public')))
app.use(
  '/dfeuk-frontend',
  express.static(path.join(__dirname, '/node_modules/dfeuk-frontend/dist')),
)
app.use(
  '/dfeuk-frontend',
  express.static(path.join(__dirname, '/node_modules/dfeuk-frontend/packages')),
)
app.use(
  '/iframe-resizer',
  express.static(path.join(__dirname, 'node_modules/iframe-resizer/')),
)

// View engine (nunjucks)
app.set('view engine', 'njk')

// Nunjucks configuration
const appViews = [
  path.join(__dirname, '/app/views/'),
  path.join(__dirname, '/node_modules/dfeuk-frontend/packages/components'),
]

const env = nunjucks.configure(appViews, {
  autoescape: true,
  express: app,
  noCache: true,
  watch: true,
})

markdown.register(env, marked.parse)

/*
 * Add some global nunjucks helpers
 */
env.addGlobal('getHTMLCode', fileHelper.getHTMLCode)
env.addGlobal('getNunjucksCode', fileHelper.getNunjucksCode)
env.addGlobal('getJSONCode', fileHelper.getJSONCode)
env.addFilter('highlight', (code, language) => {
  const languages = language ? [language] : false
  return highlightjs.highlightAuto(code.trim(), languages).value
})

var addNunjucksFilters = function (env) {
  var customFilters = require('./app/filters.js')(env)
  var filters = Object.assign(customFilters)
  Object.keys(filters).forEach(function (filterName) {
    env.addFilter(filterName, filters[filterName])
  })

  env.addFilter('date', dateFilter)
}

addNunjucksFilters(env)

// Get a post

app.get('/', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/teams?filters[Enabled][\$eq]=true&sort=Title&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var services = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?sort=Title&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var posts = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?sort=Publication_date%3Adesc&pagination[limit]=3&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var tags = {
    method: 'get',
    url: `${process.env.cmsurl}api/tags?sort=Tag&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var teams = response.data

      axios(services)
        .then(function (responses) {
          var services = responses.data

          axios(posts)
            .then(function (response) {
              var posts = response.data

              axios(tags)
                .then(function (response) {
                  var tags = response.data

                  res.render('index', { teams, services, posts, tags })
                })
                .catch(function (error) {
                  console.log(error)
                })
            })
            .catch(function (error) {
              console.log(error)
            })
        })
        .catch(function (error) {
          console.log(error)
        })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/teams', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/teams?filters[Enabled][\$eq]=true&sort=Title&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var teams = response.data

      res.render('teams/index', { teams })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/home', function (req, res) {
  req.session.data = {}

  res.redirect('/')
})

app.get('/team/:id', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/teams?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var services = response.data

      res.render('team/index', { services })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/tag/:id', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?filters[tags][slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var tag = {
    method: 'get',
    url: `${process.env.cmsurl}api/tags?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var tags = {
    method: 'get',
    url: `${process.env.cmsurl}api/tags?sort=Tag&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  //    url: `${process.env.cmsurl}api/posts?filters[slug][\$eq]=${req.params.post_slug}&[service][slug][\$eq]=${req.params.service_slug}&populate=%2A`,

  axios(config)
    .then(function (response) {
      var posts = response.data

      axios(tag)
      .then(function (response) {
        var tag = response.data
      
        axios(tags)
        .then(function (response) {
          var tags = response.data
    
          res.render('tag/index', { posts, tag, tags })
        })
        .catch(function (error) {
          console.log(error)
        })
      })
      .catch(function (error) {
        console.log(error)
      })

    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/:service_slug/:post_slug', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?filters[slug][\$eq]=${req.params.post_slug}&[service][slug][\$eq]=${req.params.service_slug}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var service = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?filters[slug][\$eq]=${req.params.service_slug}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var data = response.data

      axios(service)
        .then(function (responses) {
          var services = responses.data

          res.render('post/index', { data, services })
        })
        .catch(function (error) {
          console.log(error)
        })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/auth/:id', function (req, res) {
  var service = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }
  axios(service)
    .then(function (responses) {
      var services = responses.data

      res.render('auth', { services })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.post('/auth/:id', function (req, res) {
  var service = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }
  axios(service)
    .then(function (responses) {
      var services = responses.data

      // is the password valid?

      if (req.body.password === services.data[0].attributes.Password) {
        // set password into session

        req.session.data['auth-' + services.data[0].attributes.Slug] = true

        // redirect to the service

        console.log('Authenticated - redirecting to service')
        res.redirect('/' + services.data[0].attributes.Slug)
      } else {
        console.log('Not authenticated - redirecting to password page')

        req.session.data['auth-' + services.data[0].attributes.Slug] = false
        var error = "You've entered an incorrect password"
        req.session.data['error'] = error
        res.redirect('/auth/' + services.data[0].attributes.Slug)
      }
    })
    .catch(function (error) {
      console.log(error)
    })
})

// Render standalone design examples
app.get('/design-example/:group/:item/:type', (req, res) => {
  const displayFullPage = req.query.fullpage === 'true'
  const blankPage = req.query.blankpage === 'true'
  const { group } = req.params
  const { item } = req.params
  const { type } = req.params
  const examplePath = path.join(
    __dirname,
    `app/views/design-system/${group}/${item}/${type}/index.njk`,
  )

  // Get the given example as HTML.
  const exampleHtml = fileHelper.getHTMLCode(examplePath)

  // Wrap the example HTML in a basic html base template.
  let baseTemplate = 'includes/design-example-wrapper.njk'
  if (displayFullPage) {
    baseTemplate = 'includes/design-example-wrapper-full.njk'
  }
  if (blankPage) {
    baseTemplate = 'includes/design-example-wrapper-blank.njk'
  }

  res.render(baseTemplate, { body: exampleHtml, item })
})

app.get('/search', (req, res) => {
  const query = req.query['search-field'] || ''
  const resultsPerPage = 10
  let currentPage = parseInt(req.query.page, 10)
  const results = pageIndex.search(query)
  const maxPage = Math.ceil(results.length / resultsPerPage)
  if (!Number.isInteger(currentPage)) {
    currentPage = 1
  } else if (currentPage > maxPage || currentPage < 1) {
    currentPage = 1
  }

  const startingIndex = resultsPerPage * (currentPage - 1)
  const endingIndex = startingIndex + resultsPerPage

  res.render('includes/search.njk', {
    currentPage,
    maxPage,
    query,
    results: results.slice(startingIndex, endingIndex),
    resultsLen: results.length,
  })
})

app.get('/suggestions', (req, res) => {
  const results = pageIndex.search(req.query.search)
  const slicedResults = results.slice(0, 10)
  res.set({ 'Content-Type': 'application/json' })
  res.send(JSON.stringify(slicedResults))
})

// Automatically route pages
app.get(/^([^.]+)$/, (req, res, next) => {
  routing.matchRoutes(req, res, next)
})

// Render sitemap.xml in XML format
app.get('/sitemap.xml', (_, res) => {
  res.set({ 'Content-Type': 'application/xml' })
  res.render('sitemap.xml')
})

// Render robots.txt in text format
app.get('/robots.txt', (_, res) => {
  res.set('text/plain')
  res.render('robots.txt')
})

app.get('/:id', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?filters[service][slug][\$eq]=${req.params.id}&sort=Publication_date%3Adesc&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var service = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var posts = response.data

      axios(service)
        .then(function (responses) {
          var services = responses.data

          res.render('posts/index', { posts, services })
        })
        .catch(function (error) {
          console.log(error)
        })
    })
    .catch(function (error) {
      console.log(error)
    })
})

// Render 404 page
app.get('*', (_, res) => {
  res.statusCode = 404
  res.render('page-not-found')
})

// Run application on configured port
if (config.env === 'development') {
  app.listen(config.port - 50, () => {
    browserSync({
      files: ['app/views/**/*.*', 'public/**/*.*'],
      notify: true,
      open: false,
      port: config.port,
      proxy: `localhost:${config.port - 50}`,
      ui: false,
    })
  })
} else {
  app.listen(config.port)
}

setTimeout(() => {
  pageIndex.init()
}, 2000)

module.exports = app
