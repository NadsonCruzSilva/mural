// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Append-only public messages. Characters are Unicode scalar values, not graphemes.
contract Mural {
    struct Message { uint256 id; string content; address author; uint256 timestamp; }
    Message[] private messages;
    error EmptyMessage();
    error MessageTooLong();
    error InvalidUtf8();
    error InvalidId();
    error InvalidLimit();
    event MessagePublished(uint256 indexed id, address indexed author, string content, uint256 timestamp);

    function publishMessage(string calldata content) external {
        bytes calldata data = bytes(content);
        if (data.length == 0) revert EmptyMessage();
        if (data.length > 1120) revert MessageTooLong();
        uint256 count;
        for (uint256 i; i < data.length;) {
            uint8 c = uint8(data[i]);
            uint256 width;
            if (c < 0x80) width = 1;
            else if (c >= 0xc2 && c <= 0xdf) width = 2;
            else if (c >= 0xe0 && c <= 0xef) width = 3;
            else if (c >= 0xf0 && c <= 0xf4) width = 4;
            else revert InvalidUtf8();
            if (i + width > data.length) revert InvalidUtf8();
            for (uint256 j = 1; j < width; j++) {
                uint8 next = uint8(data[i + j]);
                if (next < 0x80 || next > 0xbf) revert InvalidUtf8();
            }
            if (width >= 3) {
                uint8 second = uint8(data[i + 1]);
                if ((c == 0xe0 && second < 0xa0) || (c == 0xed && second >= 0xa0)
                    || (c == 0xf0 && second < 0x90) || (c == 0xf4 && second >= 0x90)) revert InvalidUtf8();
            }
            i += width;
            if (++count > 280) revert MessageTooLong();
        }
        uint256 id = messages.length + 1;
        messages.push(Message(id, content, msg.sender, block.timestamp));
        emit MessagePublished(id, msg.sender, content, block.timestamp);
    }

    function totalMessages() external view returns (uint256) { return messages.length; }
    function getMessage(uint256 id) external view returns (Message memory) {
        if (id == 0 || id > messages.length) revert InvalidId();
        return messages[id - 1];
    }
    /// @notice offset is zero-based, oldest first; the frontend reverses each page.
    function getMessages(uint256 offset, uint256 limit) external view returns (Message[] memory page) {
        if (limit == 0 || limit > 50) revert InvalidLimit();
        if (offset >= messages.length) return new Message[](0);
        uint256 size = messages.length - offset;
        if (size > limit) size = limit;
        page = new Message[](size);
        for (uint256 i; i < size; i++) page[i] = messages[offset + i];
    }
}
