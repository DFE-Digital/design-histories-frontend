module.exports = {

  // Adobe analytics
  adobeTrackingUrl: process.env.ADOBE_TRACKING_URL || '',

  // Base URL
  baseURL: process.env.BASE_URL || 'https://apply-the-service-standard.education.gov.uk/',

  // Environment
  env: process.env.NODE_ENV || 'development',

  // Port to run local development server on
  port: process.env.PORT || 3098,

  mtype: 'design',

  githubrepo: 'https://github.com/DFE-Digital/ucd-manual'
  
};


