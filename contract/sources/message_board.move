module message_board_addr::message_board {
    use std::string::String;
    use std::signer;
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::coin::{Self, MintCapability};
    use std::vector;
    use aptos_framework::timestamp;

    struct Message has key {
        string_content: String,
    }

    struct InterviewData has store, copy, drop {
        user_address: address,
        company_name: String,
        interview_question: String,
        timestamp: u64,
    }

    struct InterviewHistory has key {
        interviews: vector<InterviewData>,
    }

    const BOARD_OBJECT_SEED: vector<u8> = b"message_board";

    struct BoardObjectController has key {
        extend_ref: ExtendRef,
    }

    // BBT token definition
    struct BBT has key {}

    // Store mint capability in module
    struct BBTMintCapability has key {
        mint_cap: MintCapability<BBT>,
    }

    // This function is only called once when the module is published for the first time.
    fun init_module(sender: &signer) {
        let constructor_ref = &object::create_named_object(sender, BOARD_OBJECT_SEED);
        move_to(&object::generate_signer(constructor_ref), BoardObjectController {
            extend_ref: object::generate_extend_ref(constructor_ref),
        });

        // Initialize BBT coin
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<BBT>(
            sender,
            std::string::utf8(b"Behavioral Buddy Token"),
            std::string::utf8(b"BBT"),
            8, // decimals
            true, // monitor_supply
        );

        // Register the BBT coin on sender account
        coin::register<BBT>(sender);

        // Store mint capability, destroy the others as we don't need them for this example
        move_to(sender, BBTMintCapability { mint_cap });
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_freeze_cap(freeze_cap);

        // Initialize interview history
        move_to(sender, InterviewHistory {
            interviews: vector::empty(),
        });
    }

    // ======================== Write functions ========================

    public entry fun post_message(
        _sender: &signer,
        new_string_content: String,
    ) acquires Message, BoardObjectController {
        if (!exist_message()) {
            let board_obj_signer = get_board_obj_signer();
            move_to(&board_obj_signer, Message {
                string_content: new_string_content,
            });
        };
        let message = borrow_global_mut<Message>(get_board_obj_address());
        message.string_content = new_string_content;
    }

    // Function to earn BBT rewards
    public entry fun earnBBT(
        user: &signer,
        company_name: String,
        interview_question: String
    ) acquires BBTMintCapability, InterviewHistory {
        let user_addr = signer::address_of(user);
        
        // Register the BBT coin on user's account if not already registered
        if (!coin::is_account_registered<BBT>(user_addr)) {
            coin::register<BBT>(user);
        };
        
        // Get mint capability and mint 1 BBT to the user
        let mint_cap = &borrow_global<BBTMintCapability>(@message_board_addr).mint_cap;
        let coins_minted = coin::mint(1_00000000, mint_cap); // 1 BBT with 8 decimal places
        coin::deposit(user_addr, coins_minted);

        // Store interview data
        let interview_history = borrow_global_mut<InterviewHistory>(@message_board_addr);
        vector::push_back(&mut interview_history.interviews, InterviewData {
            user_address: user_addr,
            company_name,
            interview_question,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ======================== Read Functions ========================

    #[view]
    public fun exist_message(): bool {
        exists<Message>(get_board_obj_address())
    }

    #[view]
    public fun get_message_content(): (String) acquires Message {
        let message = borrow_global<Message>(get_board_obj_address());
        message.string_content
    }

    // Get BBT balance for a user
    #[view]
    public fun get_bbt_balance(user_addr: address): u64 {
        if (coin::is_account_registered<BBT>(user_addr)) {
            coin::balance<BBT>(user_addr)
        } else {
            0
        }
    }

    // Get interview history for a user
    #[view]
    public fun get_interview_history(user_addr: address): vector<InterviewData> acquires InterviewHistory {
        let interview_history = borrow_global<InterviewHistory>(@message_board_addr);
        let user_interviews = vector::empty();
        let i = 0;
        let len = vector::length(&interview_history.interviews);
        while (i < len) {
            let interview = vector::borrow(&interview_history.interviews, i);
            if (interview.user_address == user_addr) {
                vector::push_back(&mut user_interviews, *interview);
            };
            i = i + 1;
        };
        user_interviews
    }

    // Get all interview questions from all users
    #[view]
    public fun get_all_interview_questions(): vector<InterviewData> acquires InterviewHistory {
        let interview_history = borrow_global<InterviewHistory>(@message_board_addr);
        interview_history.interviews
    }

    // ======================== Helper functions ========================

    fun get_board_obj_address(): address {
        object::create_object_address(&@message_board_addr, BOARD_OBJECT_SEED)
    }

    fun get_board_obj_signer(): signer acquires BoardObjectController {
        object::generate_signer_for_extending(&borrow_global<BoardObjectController>(get_board_obj_address()).extend_ref)
    }

    // ======================== Unit Tests ========================

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }
}