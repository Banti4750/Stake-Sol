# Solana Staking Contract 🚀

A modern Solana staking contract built with Anchor framework that allows users to stake SOL and earn points based on the staking duration.

## Features ✨

- **Stake SOL**: Lock your SOL tokens to earn staking points
- **Dynamic Points System**: Earn points based on staking amount and duration
- **Flexible Unstaking**: Withdraw your staked SOL at any time
- **Points Tracking**: Monitor your earned points in real-time

## Prerequisites 📋

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Rust](https://rustup.rs/)
- [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://www.anchor-lang.com/docs/installation)

## Installation 🛠️

```bash
# Clone the repository
git clone <your-repo-url>
cd stake_contract

# Install dependencies
yarn install

# Build the program
anchor build
```

## Testing 🧪

```bash
# Run the test suite
anchor test
```

## Contract Structure 📝

### Accounts

- **StakeAccount**: PDA account that holds staking information
  - Owner: Public key of the account owner
  - Staked Amount: Amount of SOL currently staked
  - Total Points: Accumulated staking points
  - Last Update Time: Timestamp of the last points update

### Instructions

1. **Create PDA Account**
   - Initializes a new staking account for the user
   - Seeds: ["client1", user_pubkey]

2. **Stake**
   - Stakes SOL into the contract
   - Updates points based on previous staking period
   - Requires positive stake amount

3. **Unstake**
   - Withdraws staked SOL from the contract
   - Updates points before unstaking
   - Requires sufficient staked balance

4. **Claim Points**
   - Views current claimable points
   - Updates points to current timestamp

## Points Calculation 📊

- Points are calculated based on the formula:
  ```
  Points = (Staked Amount * Time Staked) / (POINTS_PER_SOL_PER_DAY)
  ```
- `POINTS_PER_SOL_PER_DAY` = 1,000,000
- Points are updated whenever stake/unstake operations occur

## Security Considerations 🔒

- All account validations use Anchor's constraint system
- PDA accounts are properly derived and validated
- Amount checks prevent overflow/underflow
- Owner verification on all sensitive operations

## Development 👨‍💻

```bash
# Build the program
anchor build

# Deploy to localnet
anchor deploy

# Run tests
anchor test
```

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
