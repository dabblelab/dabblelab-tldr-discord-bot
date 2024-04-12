# Use the official Node.js 20 image from Docker Hub
FROM node:20

# Set the working directory
WORKDIR /app

# Copy all of the code
COPY . .

# Clean the npm cache
RUN npm cache clean --force

# Install dependencies
RUN npm install

# fix build error due to wrong typedefinition export
RUN sed -i '6d' "node_modules/@langchain/openai/dist/utils/openai.d.ts"

# Start the app
CMD [ "npm", "start" ]

# Expose the port the app runs on
EXPOSE 3000
