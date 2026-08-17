import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const templates = [
  {
    name: 'EMAIL_VERIFICATION',
    subject: 'Verify your email address',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Verify your email address to activate your Moringa Store account.</p>' +
      '<p><a href="{{verificationUrl}}">Verify email</a></p>' +
      '<p>This link will expire in 24 hours.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'Verify your email address to activate your Moringa Store account.\n\n' +
      '{{verificationUrl}}\n\n' +
      'This link will expire in 24 hours.',
    variables: { name: 'string', verificationUrl: 'string' },
  },
  {
    name: 'PASSWORD_RESET',
    subject: 'Reset your password',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Reset your password for your Moringa Store account.</p>' +
      '<p><a href="{{resetUrl}}">Reset password</a></p>' +
      '<p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'Reset your password for your Moringa Store account.\n\n' +
      '{{resetUrl}}\n\n' +
      'This link will expire in 1 hour. If you did not request this, please ignore this email.',
    variables: { name: 'string', resetUrl: 'string' },
  },
  {
    name: 'LOGIN_ALERT',
    subject: 'New login to your Moringa Store account',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>A new login was detected on your Moringa Store account.</p>' +
      '<ul>' +
      '<li><strong>Browser:</strong> {{browser}}</li>' +
      '<li><strong>OS:</strong> {{os}}</li>' +
      '<li><strong>Device:</strong> {{device}}</li>' +
      '<li><strong>IP:</strong> {{ip}}</li>' +
      '<li><strong>Location:</strong> {{location}}</li>' +
      '</ul>' +
      '<p>If this was not you, please secure your account immediately.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'A new login was detected on your Moringa Store account.\n\n' +
      '- Browser: {{browser}}\n' +
      '- OS: {{os}}\n' +
      '- Device: {{device}}\n' +
      '- IP: {{ip}}\n' +
      '- Location: {{location}}\n\n' +
      'If this was not you, please secure your account immediately.',
    variables: {
      name: 'string',
      browser: 'string',
      os: 'string',
      device: 'string',
      ip: 'string',
      location: 'string',
    },
  },
  {
    name: 'WELCOME',
    subject: 'Welcome to Moringa Store',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Your account has been created successfully.</p>' +
      '<p>You can now browse products, save addresses, and place orders.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'Your account has been created successfully.\n\n' +
      'You can now browse products, save addresses, and place orders.',
    variables: { name: 'string' },
  },
  {
    name: 'EMAIL_VERIFIED',
    subject: 'Your email has been verified',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Your email address has been verified successfully. You can now log in and use all store features.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'Your email address has been verified successfully. You can now log in and use all store features.',
    variables: { name: 'string' },
  },
  {
    name: 'PROFILE_UPDATED',
    subject: 'Your profile was updated',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Your account profile was updated successfully.</p>' +
      '<p>If you did not make this change, please contact support immediately.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'Your account profile was updated successfully.\n\n' +
      'If you did not make this change, please contact support immediately.',
    variables: { name: 'string' },
  },
  {
    name: 'ADDRESS_ADDED',
    subject: 'New address added to your account',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>A new delivery address was added to your account.</p>' +
      '<p>If you did not add this address, please contact support.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'A new delivery address was added to your account.\n\n' +
      'If you did not add this address, please contact support.',
    variables: { name: 'string' },
  },
  {
    name: 'ADDRESS_UPDATED',
    subject: 'Address updated on your account',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>One of your delivery addresses was updated.</p>' +
      '<p>If you did not make this change, please contact support.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'One of your delivery addresses was updated.\n\n' +
      'If you did not make this change, please contact support.',
    variables: { name: 'string' },
  },
  {
    name: 'ADDRESS_DELETED',
    subject: 'Address removed from your account',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>A delivery address was removed from your account.</p>' +
      '<p>If you did not make this change, please contact support.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'A delivery address was removed from your account.\n\n' +
      'If you did not make this change, please contact support.',
    variables: { name: 'string' },
  },
  {
    name: 'REVIEW_POSTED',
    subject: 'Your review was posted',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Your product review has been published. Thank you for sharing your feedback.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'Your product review has been published. Thank you for sharing your feedback.',
    variables: { name: 'string' },
  },
  {
    name: 'COMMENT_POSTED',
    subject: 'Your comment was posted',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Your comment on a review has been published.</p>',
    textBody:
      'Hello {{name}},\n\n' + 'Your comment on a review has been published.',
    variables: { name: 'string' },
  },
  {
    name: 'BLOG_POSTED',
    subject: 'New article published on Moringa Store',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>A new blog post has been published. Check it out on the Wellness Journal.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'A new blog post has been published. Check it out on the Wellness Journal.',
    variables: { name: 'string' },
  },
  {
    name: 'BLOG_UPDATED',
    subject: 'Blog post updated',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>A blog post you follow has been updated.</p>',
    textBody:
      'Hello {{name}},\n\n' + 'A blog post you follow has been updated.',
    variables: { name: 'string' },
  },
  {
    name: 'BLOG_DELETED',
    subject: 'Blog post removed',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>A blog post you follow has been removed.</p>',
    textBody:
      'Hello {{name}},\n\n' + 'A blog post you follow has been removed.',
    variables: { name: 'string' },
  },
  {
    name: 'NEW_USER_REGISTERED',
    subject: 'New user registered',
    htmlBody:
      '<p>Hello,</p>' +
      '<p>A new user account was created:</p>' +
      '<p><strong>Name:</strong> {{name}}<br/><strong>Email:</strong> {{email}}</p>',
    textBody:
      'Hello,\n\n' +
      'A new user account was created:\n\n' +
      'Name: {{name}}\n' +
      'Email: {{email}}',
    variables: { name: 'string', email: 'string' },
  },
  {
    name: 'LOW_STOCK',
    subject: 'Low stock alert',
    htmlBody:
      '<p>Hello,</p>' +
      '<p><strong>{{productName}}</strong> is running low on stock. Please review inventory and restock if needed.</p>',
    textBody:
      'Hello,\n\n' +
      '{{productName}} is running low on stock. Please review inventory and restock if needed.',
    variables: { productName: 'string' },
  },
  {
    name: 'SUPPORT_ISSUE_CREATED',
    subject: 'Support request received',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>We received your support request: <strong>{{issueTitle}}</strong>. Our team will review it shortly.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'We received your support request: {{issueTitle}}. Our team will review it shortly.',
    variables: { name: 'string', issueTitle: 'string' },
  },
  {
    name: 'SUPPORT_ISSUE_UPDATED',
    subject: 'Support request updated',
    htmlBody:
      '<p>Hello {{name}},</p>' +
      '<p>Your support request <strong>{{issueTitle}}</strong> has been updated. Please check your account for the latest status.</p>',
    textBody:
      'Hello {{name}},\n\n' +
      'Your support request {{issueTitle}} has been updated. Please check your account for the latest status.',
    variables: { name: 'string', issueTitle: 'string' },
  },
];

async function main() {
  console.log('Seeding email templates...');

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        variables: template.variables,
        isActive: true,
      },
      create: {
        name: template.name,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        variables: template.variables,
        isActive: true,
      },
    });
    console.log(`  Seeded: ${template.name}`);
  }

  console.log('Email templates seeded successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
