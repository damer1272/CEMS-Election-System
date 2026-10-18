Build a Complete Website

Create a modern, responsive web application called CEMS - CSG Election Management System.

The system is an online election platform for the College of Computing Studies Government (CSG) where students vote by scanning a QR code using their mobile phones. The system should have two separate interfaces:

User Interface
Admin Dashboard

Use a clean, modern UI inspired by university portals using Tailwind CSS with smooth animations and rounded cards.

User Interface

The user interface should be very simple.

Split the page into 2 sections.

Left Section (Voting)

Display a large QR Code.

Under the QR code display the instruction:

Scan this QR Code using your mobile phone to cast your vote.

After scanning, the QR should redirect to the voting page.

Once the user has already voted, they should no longer be allowed to vote again.

Below the QR code show a status card:

Voting Status
Not Yet Voted
Already Voted

The page should automatically refresh this status.

Right Section (Leaderboard)

Display a live leaderboard.

The leaderboard should update automatically every few seconds without refreshing the page.

Each candidate card should contain:

Candidate Picture
Candidate Name
Position
Current Vote Count

Display the vote count as a horizontal progress bar.

Example

President

John Doe

███████████████ 245 Votes

Vice President

Jane Smith

███████████ 188 Votes

Secretary

Michael Cruz

█████████ 167 Votes

The leaderboard should update in real-time using WebSockets or polling.

Voting Page

When a student scans the QR Code they are redirected to the voting page.

The voting page should include:

Student Verification

Student ID
Student Name

The system checks whether the student exists.

If already voted:

Display

"You have already cast your vote."

Disable voting.

If eligible:

Display all positions.

Example

President

○ Candidate A

○ Candidate B

○ Candidate C

Vice President

○ Candidate A

○ Candidate B

Secretary

○ Candidate A

○ Candidate B

Treasurer

○ Candidate A

○ Candidate B

Representative

○ Candidate A

○ Candidate B

Allow only one selection per position.

Include

Submit Vote

Confirmation dialog

"Are you sure you want to submit your vote?
You cannot change your vote afterwards."

Admin Dashboard

The dashboard should have a sidebar.

Sidebar menu:

Dashboard

Election Settings

Candidates

Participants

QR Code

Votes

Results

Users

Audit Logs

Settings

Logout

Dashboard

Show summary cards

Total Participants

Total Candidates

Votes Cast

Remaining Voters

Election Status

Charts

Votes per Hour

Participation Rate

Candidate Vote Distribution

Recent Activity

Candidate Management

CRUD

Add Candidate

Edit Candidate

Delete Candidate

Fields

Photo

Name

Position

Party List

Biography

Display Order

Status

Participant Management

CRUD

Import participants via Excel

Export participants

Fields

Student ID

Name

Course

Year

Section

Email

Voting Status

QR Code

Search

Filter

Pagination

QR Code Module

Automatically generate a QR Code.

The QR should point to

https://yourdomain.com/vote

Each participant can also have a personalized QR.

Allow downloading QR Codes.

Election Settings

Admin can

Open Election

Close Election

Set election date

Set start time

Set end time

Enable/Disable Live Results

Enable/Disable Leaderboard

Display countdown timer before election begins.

Vote Management

Admin can view

All Votes

Vote Timestamp

Student

Candidate Selected

Search

Filter

Export CSV

Live Results

Display

Winner per Position

Current Ranking

Vote Percentages

Animated progress bars

Pie Charts

Bar Charts

Real-time updates

User Management

Administrator Accounts

Roles

Super Admin

Election Officer

Viewer

Permissions

Authentication

Login Page

Forgot Password

Remember Me

Secure authentication

Password hashing

Role-based access

Notifications

Toast notifications

Success

Error

Warning

Information

UI Design

Modern

Minimal

Glassmorphism cards

Rounded corners

Blue and White color palette

Responsive

Desktop

Tablet

Mobile

Smooth page transitions

Dark Mode

Database

Tables

users

id

name

email

password

role

participants

id

student_id

name

course

year

section

email

has_voted

qr_code

candidates

id

name

position

party

photo

votes

elections

id

title

status

start_date

end_date

votes

id

participant_id

candidate_id

position

timestamp

audit_logs

id

user

action

date

Features

✔ QR Code Voting

✔ One Vote Per Student

✔ Live Leaderboard

✔ Real-Time Results

✔ Admin Dashboard

✔ Candidate Management

✔ Participant Management

✔ Excel Import

✔ Excel Export

✔ Secure Authentication

✔ Role Permissions

✔ Mobile Responsive

✔ Dark Mode

✔ Analytics Dashboard

✔ Audit Logs

✔ Live Charts

✔ Auto Refresh

✔ Modern UI

Tech Stack

Frontend

React.js
TypeScript
Tailwind CSS
Shadcn UI
Framer Motion
React Router
Axios

Backend

Node.js
Express.js

Database

MySQL

Authentication

JWT

QR Code

qrcode library

Charts

Recharts

Real-Time

Socket.io

Deployment

Vercel (Frontend)
Railway or Render (Backend)
MySQL Database
Overall Layout (Matching Your Sketch)
User View
------------------------------------------------------------
|                  CEMS - CSG Election System              |
------------------------------------------------------------
|  QR Code Section          |      Live Leaderboard        |
|                           |                              |
|   [ LARGE QR ]            | President                   |
|                           | ████████████ 245            |
| Scan QR to Vote           |                              |
|                           | Vice President              |
| Voting Status             | ██████████ 180             |
|                           |                              |
|                           | Secretary                  |
|                           | ████████ 140              |
------------------------------------------------------------
Admin View
--------------------------------------------------------------
| Sidebar | Dashboard                                         |
|---------|---------------------------------------------------|
| Logo    | Summary Cards                                     |
| Dashboard| Participants  Candidates  Votes  Results         |
| Candidates|-----------------------------------------------  |
| Participants| Charts                                        |
| Votes    | Recent Activity                                  |
| Results  | Candidate Statistics                             |
| Settings |                                                   |
| Logout   |                                                   |
--------------------------------------------------------------