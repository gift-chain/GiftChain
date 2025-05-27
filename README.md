# GiftChain

GiftChain is a decentralized application (dApp) that simplifies crypto gifting. It allows users to send and receive cryptocurrency gifts securely and effortlessly, leveraging blockchain technology.

---

## Table of Contents
- [GiftChain](#giftchain)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Smart Contracts](#smart-contracts)
    - [Subgraph](#subgraph)
  - [Project Structure](#project-structure)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
    - [Usage](#usage)
  - [Smart Contracts](#smart-contracts-1)
    - [Overview](#overview-1)
    - [Key Features](#key-features)
  - [Subgraph](#subgraph-1)
  - [Contributing](#contributing)
- [GiftChain project workflow](#giftchain-project-workflow)

---

## Overview

GiftChain is designed to make crypto gifting as simple as sending a message. It provides a user-friendly interface for creating, claiming, and managing crypto gifts, with features like expiration dates, secure transfers, and blockchain transparency. At its core, GiftChain is designed to prioritize user privacy by concealing the sender's address, thereby safeguarding against on-chain scruitny.

---

## Features

- **Create Gift**: Users can create crypto gift with customizable amounts and expiration dates.
- **Claim Gifts**: Recipients can claim their crypto gifts securely.
- **Reclaim Gifts**: Unclaimed gifts can be reclaimed by the sender after expiration.
- **Anonymity**: Sender's address is concealed against on-chain scrutiny.
- **Subgraph Integration**: Real-time querying of blockchain data using The Graph.

---

## Tech Stack

### Frontend
- **React**: For building the user interface.
- **Tailwind CSS**: For styling.
- **React Router**: For navigation.

### Backend
- **Node.js**: For API development.
- **Express**: For handling server-side logic.

### Smart Contracts
- **Solidity**: For writing Ethereum-based smart contracts.
- **Hardhat**: For development, testing, and deployment.

### Subgraph
- **The Graph**: For indexing and querying blockchain data.

---

## Project Structure

```
GiftChain/
├── FrontEnd/               # React-based frontend
│   ├── src/
│   │   ├── pages/          # Pages like Dashboard, Home, CreateGift
│   │   ├── ui/             # Reusable UI components
│   │   ├── assets/         # Images and icons
│   │   └── main.tsx        # Entry point for the frontend
├── BackEnd/                # Backend API
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── models/         # Database models
│   │   └── server.js       # Entry point for the backend
├── SmartContracts/         # Ethereum smart contracts
│   ├── contracts/          # Solidity contracts
│   ├── scripts/            # Deployment scripts
│   └── hardhat.config.js   # Hardhat configuration
├── Subgraph/               # The Graph subgraph
│   ├── schema.graphql      # Subgraph schema
│   ├── subgraph.yaml       # Subgraph configuration
│   └── mappings/           # Mapping functions
└── README.md               # project documentation
```

## Installation

### Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- Hardhat (for smart contract development)
- The Graph CLI (for subgraph deployment)

### Steps

1. Clone the repository:
```bash
git clone https://github.com/your-repo/GiftChain.git
cd GiftChain
```
   
2. Install dependencies for the frontend:
```bash
cd FrontEnd
npm install
```

3. Install dependencies for the backend:

```
cd ../BackEnd
npm install
```

4. Install dependencies for the smart contracts:

```
cd ../SmartContracts
npm install
```

5. Install dependencies for the subgraph:

```
cd ../Subgraph
npm install
```

### Usage

Running the Frontend

```
cd FrontEnd
npm run dev
```

Running the Backend

```
cd BackEnd
npm start
```

Deploying Smart Contracts

```
cd SmartContracts
npx hardhat run scripts/deploy.js --network <network-name>
```

Deploying the Subgraph

```
cd Subgraph
graph deploy --node https://api.thegraph.com/deploy/ <subgraph-name>
```


## Smart Contracts

### Overview

The GiftChain smart contract is the backbone of the application, enabling the creation, claiming, and reclaiming of crypto gifts. It is written in Solidity and deployed on the Ethereum blockchain. The contract ensures secure and transparent handling of gift transactions while prioritizing user privacy and efficiency.


### Key Features

1. Gift Creation:

- Users can create a gift by specifying:
    - The token address (ERC20).
    - The amount to gift.
    - An expiration date.
    - A personalized message (3 to 50 characters).
- The gift is stored on-chain with a unique giftID and marked as PENDING.

2. Gift Claiming:

- Recipients can claim a gift if:
    -The gift is in a PENDING state.
    -The gift has not expired.
    -The recipient is not the creator of the gift.
- Upon claiming, the gift's status is updated to CLAIMED, and the tokens are transferred to the recipient.

3. Gift Reclaiming:

- If a gift is not claimed before its expiration date, the creator can reclaim it.
- Reclaiming is only allowed if:
    -The gift is in a PENDING state.
    -The gift has expired.
- Upon reclaiming, the gift's status is updated to RECLAIMED, and the tokens are returned to the creator.

4.Gift Validation:

- Users can validate a gift's status to check if it is:
    - PENDING (ready to be claimed).
    - CLAIMED (already claimed).
    - RECLAIMED (already reclaimed).
    - Invalid (non-existent or expired).


## Subgraph 

The subgraph is used to index and query blockchain data in real-time. It is built using The Graph and provides APIs for querying gift transactions.

Key Files
- schema.graphql: Defines the data structure.
- mappings/: Contains mapping functions for processing blockchain events.

## Contributing 

We welcome contributions! Please follow these steps:

1. Fork this repository
2. Create a new branch:
```
git checkout -b feature/your-feature-name
```

3. Commit your changes:
```
git commit -m "Add your message here"
```

4. Push to your branch:
```
git push origin feature/your-feature-name
```

5. Open a pull request

# GiftChain project workflow

```mermaid
    graph TD
    A[User] -->|Connects Wallet| B[Frontend]
    B -->|Create Gift| C{Check Allowance}
    C -->|Sufficient Allowance| D[Backend]
    C -->|Insufficient Allowance| E[Approve Relayer]
    E --> D
    D -->|Calls createGift| F[Smart Contract]
    F -->|Generates Raw Code| D
    D -->|Sends Raw Code| B
    F -->|Sends Gift Data| G[Subgraph]
    G -->|Fetches Data| H[Dashboard in Frontend]
    A -->|Reclaim Expired Gift| I[Call reclaim Function]
    I --> F
    A -->|Claim Gift with Code| J[Call claim Function]
    J --> F
    A -->|Validate Gift Code| K[Call Validate Function]
    K -->|Checks Gift Status| F
```