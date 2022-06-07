# Anchor Strategy Pattern

This Anchor suite has been developed as a showcase for the [Strategy Pattern](https://en.wikipedia.org/wiki/Strategy_pattern) where a `master` program is initialized with a `strategy` knowing nothing about it at the beginning and just reading values from it.

During `master` initialization we need to specify a `stragey_state` account where the `master` during later `refresh` instructions will read the selected strategy outcomes.

## Features

Some of the advantages this pattern can introduce:

### Maintanebility

As long as the strategy is saving the outcome in the expected way, in the `StrategyState` account, we can create as many strategies as we need. This can be useful for programs deployment: the master program can perfectly work with strageies deployed later than it.

### Separation of concerns

`master` program knows nothing about the current strategy implementation, this leads to a good [separation of concerns](https://en.wikipedia.org/wiki/Separation_of_concerns) to implement coposable programs.

## Future developments

Following some of the main problems of the current implementation:

### StrategyState Account Replication

The `StrategyState` account has been replicated in each strategy:

```
#[account]
pub struct StrategyState {
    pub value: u64,
    pub refreshed_slot: u64,
}
```

this is needed to allow Anchor infer the correct `program::ID` for the account discriminator. We currently can't move the account in a common library or in the master program.

### StrategyState Account cloned in Master

The `StrategyState` account has been replicated in the master program too. This allows the deserialization as:

```
let account_data =  ctx.accounts.strategy_state.try_borrow_data()?;
let mut account_data_slice: &[u8] = &account_data;
let strategy_state = StrategyState::try_deserialize_unchecked(&mut account_data_slice)?;
```

but the `StrategyState` account shouldn't be a master program child account.

## Why not using a CPI inside master refresh instruction?

Considering the current Solana nested CPI calls limitations, as of now this limit is set to 4 nested calls, we decided to split the two instructions, calling directly the `use_strategy` instruction on the strategy and then the `refresh` instruction on the master. This way we can save one nested call.

This approach can lead to the risk of using stale data in the refresh ix, for example if the client forgot to call `use_strategy`. Depending on the product context this can be something to avoid: introducing the `refreshed_slot` in the `StrategyState` can be used to check if the current state is stale and for example rejecting the `master` `refresh` call.
