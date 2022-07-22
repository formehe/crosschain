## **说明**

- **暂停权限**

例如：ERC20Locker.sol,EthLocker.sol,TopBridge.sol和ERC20MintProxy.sol都是继承AdminControlledUpgradeable.sol

AdminControlledUpgradeable会有暂停及开启的逻辑

针对以上合约默认都是暂停的，所以在部署合约之后是需要开启的
 
也是可以做到部分开启，如果你只想开启某个（对应的值取反就可以，在调用adminPause设置进去） 

对应的值：

uint constant PAUSED_LOCK = 1 << 0;

uint constant PAUSED_UNLOCK = 1 << 1;

uint constant PAUSED_BURN = 1 << 0;

uint constant PAUSED_MINT = 1 << 1;

uint constant private PAUSED_ADD_BLOCK = 4;

具体方法(具体调用详见方法文档)：

adminPause(uint flags)

paused()

<br>
  
- **重复解锁和铸造**

例如：ERC20Locker.sol,EthLocker.sol,和ERC20MintProxy.sol

具体方法(具体调用详见方法文档)：

usedProofs(bytes32 _bytes32)

<br>

- **权限角色**

需要权限的合约都会继承AccessControl.sol这里面会专门有针对权限的方法

**目前**

含义：owner角色

OWNER_ROLE = 0x0eddb5b75855602b7383774e54b0f5908801044896417c7278d8b72cd62555b6 

含义：就算是暂停，此角色里的人也是可以操作的如解锁,销毁

CONTROLLED_ROLE = 0x8f2157482fb2324126e5fbc513e0fe919cfa878b0f89204823a63a35805d67de  

含义：提现角色角色

WITHDRAWAL_ROLE = 0x6043ff1e690758daf5caaebc8d9f958ef77877a407f4d128ba68b152ad130443

含义：锁定黑名单角色

BLACK_LOCK_ROLE = 0x7f600e041e02f586a91b6a70ebf1c78c82bed96b64d484175528f005650b51c4

含义：解锁黑名单角色

BLACK_UN_LOCK_ROLE = 0xc3af44b98af11d4a60c1cc6766bcc712210de97241b8cbefd5c9a0ff23992219

含义：销毁黑名单角色

BLACK_BURN_ROLE = 0x644464d9d2566ad56a676295c65afc4dcee3d72dac5acd473e78e531f06e0bce

含义：铸造黑名单角色

BLACK_MINT_ROLE = 0xd4e43efef4d741d853f42cbb6ea70c0f7d0e722b28b900128e3706c76762edc8

含义：收据id黑名单角色

FORBIDEN_ROLE = 0x3ae7ceea3d592ba264a526759c108b4d8d582ba37810bbb888fcee6f32bbf04d

含义：添加块头角色

ADDBLOCK_ROLE = 0xf36087c19d4404e16d698f98ed7d63f18bd7e07261603a15ab119b9c73979a86

具体方法(具体调用详见方法文档)：

supportsInterface(bytes4 interfaceId)

hasRole(bytes32 role, address account)

getRoleAdmin(bytes32 role)

grantRole(bytes32 role, address account)

revokeRole(bytes32 role, address account)

renounceRole(bytes32 role, address account)

<br>

**注**：

所有角色的admin角色都是owner

owner的admin角色还是owner

<br>

- **_____initialize函数**

针对合约的初始化函数,只能初始化一次

