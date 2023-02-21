# Design histories frontend

Frontend for the design history service at https://design-histories.education.gov.uk 


## Running the application locally

### Prerequisite

Install the long-term support (LTS) version of <a href="https://nodejs.org/en/">Node.js</a>, which includes npm.

### Content Management System (CMS)

You will need a version of the Strapi CMS running locally. You can clone the version we use for this CMS and run that locally. 

Our version of Strapi which has models to support the design history frontend can be cloned from: https://github.com/DFE-Digital/design-histories-cms-strapi/tree/main/dfe-design-histories-cms

### Cloning and running the application

Clone the repo: https://github.com/DFE-Digital/design-histories-frontend.git

Install the required npm packages with: `npm install`

Create a .env file on the root of the project and add 2 keys:

apikey=
cmsurl=

You will need to generate an API within Strapi to assign to the apikey parameter and update the URL to the running version of the CMS.

Run the project in development mode `npm run watch` and visit <a href="http://localhost:3098">http://localhost:3098</a>.


## Get in touch if you need help

https://design-histories.education.gov.uk/design-ops/


## Licence

The codebase is released under the MIT Licence, unless stated otherwise. This covers both the codebase and any sample code in the documentation. The documentation is © Crown copyright and available under the terms of the Open Government 3.0 licence.
