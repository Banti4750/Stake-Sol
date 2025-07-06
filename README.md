# Solana Staking Contract 🚀

A modern Solana staking contract built with Anchor framework that allows users to stake SOL and earn points based on the staking duration.

## Live Demo 🚀

Check out the live demo here: [Live Demo](https://stake-sol-git-main-banti-kumars-projects.vercel.app/)

## Program Id  🚀
Program Id: GiSpyqsUFLfHZ3Vshoshg21AmuFzm814xQ2vFuF7GDuJ

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
- 

| **Direct Lamports**   | ```rust
**vault.try_borrow_mut_lamports()? -= amount;
**signer.try_borrow_mut_lamports()? += amount;
``` | Simpler but riskier |

---

### 4. **When to Use Each**
| Use Case                           | Preferred Method        | Reason                                                                 |
|------------------------------------|-------------------------|-----------------------------------------------------------------------|
| Transferring from **PDA**          | `invoke_signed`         | Built-in signature validation                                         |
| Micro-optimizing for gas           | Direct Lamports         | Lower CU cost (e.g., in high-frequency trades)                        |
| Transferring from non-PDA accounts | Direct Lamports         | No signing needed (just ensure `mut` and proper authority)            |

---

### Key Takeaways:
1. **`invoke_signed` is safer for PDAs**  
   - The runtime enforces that only the correct PDA seeds can spend funds.
   - Use this unless you have a specific reason to optimize gas.

2. **Direct lamports are faster/cheaper**  
   - Useful for internal bookkeeping (e.g., redistributing SOL between program-controlled accounts).
   - Requires careful manual checks to avoid exploits.

3. **Never skip validation**  
   Even with direct lamports, you **must**:
   ```rust
   // Check the PDA matches expected seeds
   require!(vault_is_valid, Error::Unauthorized);

   // Check for underflow/overflow
   require!(vault_balance >= amount, Error::InsufficientFunds);
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
