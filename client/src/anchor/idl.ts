export const IDL = {
  "address": "GiSpyqsUFLfHZ3Vshoshg21AmuFzm814xQ2vFuF7GDuJ",
  "metadata": {
    "name": "stake_contract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claim_points",
      "discriminator": [
        106,
        26,
        99,
        252,
        9,
        196,
        78,
        172
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "stake_data",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "create_pda_account",
      "discriminator": [
        236,
        59,
        195,
        238,
        228,
        119,
        205,
        35
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "stake_data",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "get_points",
      "discriminator": [
        175,
        65,
        116,
        251,
        176,
        33,
        167,
        225
      ],
      "accounts": [
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "stake_data",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "stake_data",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "stake_data",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "StakeAccount",
      "discriminator": [
        80,
        158,
        67,
        124,
        50,
        189,
        192,
        255
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidAmount",
      "msg": "Amount must be greater than 0"
    },
    {
      "code": 6001,
      "name": "Unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6002,
      "name": "Overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6003,
      "name": "InvalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 6004,
      "name": "Underflow",
      "msg": "Arithmetic underflow"
    },
    {
      "code": 6005,
      "name": "InsufficientStake",
      "msg": "Insufficient staked amount"
    },
    {
      "code": 6006,
      "name": "InsufficientVaultBalance",
      "msg": "Insufficient vault balance"
    }
  ],
  "types": [
    {
      "name": "StakeAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "staked_amount",
            "type": "u64"
          },
          {
            "name": "total_points",
            "type": "u64"
          },
          {
            "name": "last_update_time",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
}