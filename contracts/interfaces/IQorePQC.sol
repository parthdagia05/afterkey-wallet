// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IQorePQC {
    function pqcVerify(
        bytes calldata pubkey,
        bytes calldata signature,
        bytes calldata message
    ) external view returns (bool valid);

    function pqcKeyStatus(
        address account
    ) external view returns (
        bool registered,
        uint8 algorithmId,
        bytes memory pubkey,
        bool possessionProven
    );
}
