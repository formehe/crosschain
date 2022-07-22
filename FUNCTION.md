## **合约abi**

- **EthLocker.sol**

**1)_EthLocker_initialize(ITopProver _prover,uint64 _minBlockAcceptanceHeight,address _owner,ILimit limit,address _toAssetHash,address _peerLockProxyHash)**

  **方法**：

  初始化

  **权限**：

  只能初始化一次

  **参数**：

  _prover：上面部署的TopProver合约

  _minBlockAcceptanceHeight：当前传0就行

  _owner：owner权限者,可以是部署合约的地址

  limit：上面部署的Limit合约

  _toAssetHash:top端的对应币种

  _peerLockProxyHash：top端的跨链合约（例如ERC20MintProxy）

  <br>

**2)adminPause(uint flags)**

  **方法**：

  设置是否暂停,默认是全暂停

  **权限**：

  OWNER_ROLE权限

  **参数**：

  flags：设置的标识
    
  OWNER_ROLE权限

  设置为0则是全开启

  设置255则全关闭

  uint PAUSED_LOCK = 1

  设置115792089237316195423570985008687907853269984665640564039457584007913129639934只开启锁定

  uint PAUSED_UNLOCK = 2

  设置115792089237316195423570985008687907853269984665640564039457584007913129639933只开启解锁
  
  <br>

**3)adminTransfer(address payable destination, uint amount)**

  **方法**：

  提现eth
  
  **权限**：

  WITHDRAWAL_ROLE权限

  **参数**：

  destination：提现地址

  amount：提现数量

  <br>

**4)assets(address _address)**

  **方法**：

  查询eth->top的对应绑定地址

  **权限**：

  无,view方法

  **参数**：

  _address：eth端的资产地址（主币是空地址）

  **返回**：

  assetHash：top端的资产地址

  lockProxyHash：top端的跨链合约

  <br>

**5)getRoleAdmin(bytes32 role)**

  **方法**：

  返回角色权限的admin

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  **返回**：

  role admin的bytes32

  <br>

**6)grantRole(bytes32 role, address account)**

  **方法**：

  添加角色

  **权限**：

  角色的admin角色

  **参数**：

  role：角色的bytes32

  account：账户地址

  <br>

**7)hasRole(bytes32 role, address account)**

  **方法**：

  角色里是否存在此账户

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  account：账户地址

  **返回**：

  bool值

  <br>

**8)limit()**

  **方法**：

  返回限制合约的地址

  **权限**：

  无,view方法

  **参数**：

  无

  **返回**：

  地址

  <br>

**9)lockToken(address fromAssetHash, uint256 amount, address receiver)**

  **方法**：

  锁定资产

  **权限**：

  1,当前合约没有暂停
  2,sender不在BLACK_LOCK_ROLE权限角色黑名单里

  **补充说明**：

  除上面权限外还会校检

  (1),fromAssetHash和receiver是否是空地址及amount是否为0

  (2),from是否有绑定地址（通过bindAssetHash绑定的）
  
  (3),amount是否在配置的锁定金额区间（满足最大最小）

  (4),safeTransferFrom

  **参数**：

  fromAssetHash: token（如果是主币地址为0x0000000000000000000000000000000000000000）

  amount:数量

  receiver：接收地址

  <br>

**10)paused()**

  **方法**：

  返回当前的状态

  **权限**：

  无,view方法

  **返回**：

  uint

  <br>

**11)renounceRole(bytes32 role, address account)**

  **方法**：

  放弃权限，原作用是移除自己在角色的权限，当前调用直接报错"not support"

  **参数**：

  role：角色的bytes32

  account：账户地址

  <br>

**12)revokeRole(bytes32 role, address account)**

  **方法**：

  移除角色里的账户

  **权限**：

  role的admin

  **参数**：

  role：角色的bytes32

  account：账户地址

  <br>

**13)supportsInterface(bytes4 interfaceId)**
  
  **方法**：

  查询合约是否实现了此接口

  **权限**：

  无,view方法

  **参数**：

  interfaceId： 方法id =  bytes4(keccak256('supportsInterface(bytes4)'))

  **返回**：

  bool值

  <br>

**14)function unlockToken(bytes memory proofData, uint64 proofBlockHeight)**

  **方法**：

  资产的解锁

  **权限**：

  1,当前合约没有暂停 || sender在CONTROLLED_ROLE权限角色里
  2,sender不在BLACK_UN_LOCK_ROLE权限角色黑名单里
  3,收据id不在黑名

  **补充说明**：

  除上面权限外还会校检

  (1),收据验证，head验证，log验证（event事件的hash及事件参数的长度及参数的验证）

  (2),是否重复解锁及解锁时长

  **参数**:

  proofData:证明

  proofBlockHeight：高度（当前传0就行）

  <br>

**15)usedProofs(bytes32 _bytes32)**

  **方法**：

  判断某一收据是否已经解锁过

  **参数**：

  bytes32：收据id（块高 + 收据index）字节数组的keccak256  

  **返回**：

  如果是true则收据已经使用过，否则收据是没使用过的

<br>

- **ERC20Locker.sol**

**1)_ERC20Locker_initialize(ITopProver _prover,uint64 _minBlockAcceptanceHeight,address _owner,ILimit _limit)**

  **方法**：
  
  初始化

  **权限**：

  只能调用一次

  **参数**：

  _prover：验证合约

  _minBlockAcceptanceHeight：当前传0就行
  
  _owner：owner账户

  _limit :限制合约

  <br>

**2)adminPause(uint flags)**

  **方法**：

  设置是否暂停,默认是全暂停

  **权限**：

  OWNER_ROLE权限

  **参数**：

  flags：设置的标识
    
  OWNER_ROLE权限

  设置为0则是全开启

  设置255则全关闭

  uint PAUSED_LOCK = 1

  设置115792089237316195423570985008687907853269984665640564039457584007913129639934只开启锁定

  uint PAUSED_UNLOCK = 2

  设置115792089237316195423570985008687907853269984665640564039457584007913129639933只开启解锁

<br>

**3)adminTransfer(IERC20 token, address destination, uint256 amount)**

  **方法**：

  提现资产

  **权限**：

  WITHDRAWAL_ROLE权限

  **参数**：

  token：提现的资产

  destination：提现地址

  amount：提现数量

<br>  

**4)assets(address _address)**

  **方法**：

  查询eth->top的对应绑定地址

  **权限**：

  无,view方法

  **参数**：

  _address：eth端的资产地址

  **返回**：

  assetHash：top端的资产地址

  lockProxyHash：top端的跨链合约

<br>  

**(5),function bindAssetHash(address _fromAssetHash, address _toAssetHash,address _peerLockProxyHash)**  
 
  **方法**:
  
  绑定top端的资产及跨链合约

  **权限**：
  
  OWNER_ROLE权限

  **参数**：

  _fromAssetHash：eth端的token地址

  _toAssetHash：top端的token地址

  _peerLockProxyHash：top端的跨联合约（如ERC20MintProxy）

<br>  

**6)conversionDecimalsAssets(address _fromAssetHash)**

  **方法**:
  
  返回由于精度对不上，设置转换精度的资产

  **权限**：
  
  无,view方法

  **参数**：

  _fromAssetHash：eth端资产地址

  **返回**：

  fromDecimals：eth端资产的精度

  toDecimals：top端资产的精度

<br>

**7)getRoleAdmin(bytes32 role)**

  **方法**：

  返回角色权限的admin

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  **返回**：

  role admin的bytes32

<br>

**8)grantRole(bytes32 role, address account)**

  **方法**：

  添加角色

  **权限**：

  角色的admin角色

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**9)hasRole(bytes32 role, address account)**

  **方法**：

  角色里是否存在此账户

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  account：账户地址

  **返回**：

  bool值

<br>  

**10)limit()**

  **方法**：

  返回限制合约的地址

  **权限**：

  无,view方法

  **参数**：

  无

  **返回**：

  地址

<br>

**11)lockToken(address fromAssetHash, uint256 amount, address receiver)**

  **方法**：

  锁定资产

  **权限**：

  1,当前合约没有暂停
  2,sender不在BLACK_LOCK_ROLE权限角色黑名单里

  **补充说明**：

  除上面权限外还会校检

  (1),fromAssetHash和receiver是否是空地址及amount是否为0

  (2),from是否有绑定地址（通过bindAssetHash绑定的）
  
  (3),amount是否在配置的锁定金额区间（满足最大最小）

  (4),safeTransferFrom

  **参数**：

  fromAssetHash: token（如果是主币地址为0x0000000000000000000000000000000000000000）

  amount:数量

  receiver：接收地址

<br>

**12)paused()**

  **方法**：

  返回当前的状态

  **权限**：

  无,view方法

  **返回**：

  uint

<br>

**13)renounceRole(bytes32 role, address account)**

  **方法**：

  放弃权限，原作用是移除自己在角色的权限，当前调用直接报错"not support"

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**14)revokeRole(bytes32 role, address account)**

  **方法**：

  移除角色里的账户

  **权限**：

  role的admin

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**15)setConversionDecimalsAssets(address _fromAssetHash,uint8 _toAssetHashDecimals)**

  **方法**：

  设置转换资产的精度（如eth端的top(精度18)到top端是主币top（精度8））

  主要是处理类似精度对不上的问题

  **权限**：
  
  OWNER_ROLE权限

  **补充权限**：

  toAssetHashDecimals大于0

  fromAssetHash的精度必须大于0并且fromAssetHash的精度要大于toAssetHashDecimals

  **参数**：

  _fromAssetHash：eth端的资产地址

  _toAssetHashDecimals：对应top端资产的地址的精度

<br>

**16)supportsInterface(bytes4 interfaceId)**
  
  **方法**：

  查询合约是否实现了此接口

  **权限**：

  无,view方法

  **参数**：

  interfaceId： 方法id =  bytes4(keccak256('supportsInterface(bytes4)'))

  **返回**：

  bool值

<br>

**17)function unlockToken(bytes memory proofData, uint64 proofBlockHeight)**

  **方法**：

  资产的解锁

  **权限**：

  1,当前合约没有暂停 || sender在CONTROLLED_ROLE权限角色里
  2,sender不在BLACK_UN_LOCK_ROLE权限角色黑名单里
  3,收据id不在黑名

  **补充说明**：

  除上面权限外还会校检

  (1),收据验证，head验证，log验证（event事件的hash及事件参数的长度及参数的验证）

  (2),是否重复解锁及解锁时长

  **参数**:

  proofData:证明

  proofBlockHeight：高度（当前传0就行）

<br>

**18)usedProofs(bytes32 _bytes32)**

  **方法**：

  判断某一收据是否已经解锁过

  **参数**：

  bytes32：收据id（块高 + 收据index）字节数组的keccak256  

  **返回**：

  如果是true则收据已经使用过，否则收据是没使用过的

<br>

- **TopBridge.sol**

**1)function addLightClientBlocks(bytes memory data)**

  **方法**：同步块头

  **权限**：当前没有暂停&&sender属于admin(ADDBLOCK_ROLE权限)

  **参数**：

  data：块头的rlp编码字节流 

<br>  

**2)adminPause(uint flags)**

  设置是否暂停,默认是全暂停

  **权限**：
    
  OWNER_ROLE权限

  **参数**：

  flags：设置的标识

  设置为0则是全开启

  设置255则全关闭

  uint PAUSED_ADD_BLOCK = 4

  设置115792089237316195423570985008687907853269984665640564039457584007913129639931只开启添加块头

<br> 

**3)balanceOf(address _address)**

  **方法**：
  
  暂无用

  **权限**：
  
  无,view方法

  **返回**：
  
  当前都返回0

<br>   

**4)blockHashes(bytes32 blockHash)**

  **方法**

  判断此块是否已经同步

  **权限**：
   
  无,view方法

  **返回**：

  bool值，true表示已经同步，false表示未同步

<br> 

**5)blockHeights(uint64 blockHeight)**

  **方法**

  返回同步块的同步时间

  **权限**：
   
  无,view方法

  **返回**：

  uint256时间戳 

  如果是0则表示当前块头没有被同步

<br>   

**6)blockMerkleRoots(uint64 blockHeight)**

  **方法**

  返回同步块的Merkle tree Root（用来验证普通交易收据块头的Merkle tree root）

  **权限**：
   
  无,view方法

  **返回**：

  bytes32（hash值）

<br>

**7)bridgeState(bytes32 _bytes32)**

  **方法**

  返回当前选举块的信息

  **权限**：
   
  无,view方法

  **返回**：

  currentHeight：选举块的对应高度

  nextTimestamp：调用的时间

  numBlockProducers：选举块的BlockProducer数量

<br>

**8)getRoleAdmin(bytes32 role)**

  **方法**：

  返回角色权限的admin

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  **返回**：

  role admin的bytes32

<br>

**9)grantRole(bytes32 role, address account)**

  **方法**：

  添加角色

  **权限**：

  角色的admin角色

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**10)hasRole(bytes32 role, address account)**

  **方法**：

  角色里是否存在此账户

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  account：账户地址

  **返回**：

  bool值

<br>

**11)function initWithBlock(bytes memory data)**

  **方法**：
  
  初始创世块

  **权限**：
  
  OWNER_ROLE权限&&只能初始化一次

  **参数**：

  data：块头的rlp编码字节流

<br>

**12)function initialize(uint256 _lockEthAmount,address _owner)**
 
  **方法**：
  
  初始化

  **权限**：
  
  只能初始化一次

  **参数**：

  _lockEthAmount：目前传0就行

  _owner：owner地址（目前可以是部署地址）

<br>

**13)lastSubmitter()**

  **方法**：
  
  返回上一个同步块头的地址

  **权限**：
  
  无,view方法

  **参数**：

  无

  **返回**：

  地址

<br>  

**14)lockEthAmount()**

  **方法**：
  
  返回锁定eth的金额（初始化设置的_lockEthAmount，目前无用）

  **权限**：
  
  无,view方法

  **参数**：

  无

  **返回**：

  uint256

<br>
  
**15)maxMainHeight()**

  **方法**：
  
  返回当前同步块头的最新高度

  **权限**：
  
  无,view方法

  **参数**：

  无

  **返回**：

  uint64

<br>

**16)paused()**

  **方法**：

  返回当前的状态

  **权限**：

  无,view方法

  **返回**：

  uint

<br>

**17)renounceRole(bytes32 role, address account)**

  **方法**：

  放弃权限，原作用是移除自己在角色的权限，当前调用直接报错"not support"

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**18)revokeRole(bytes32 role, address account)**

  **方法**：

  移除角色里的账户

  **权限**：

  role的admin

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**19)supportsInterface(bytes4 interfaceId)**
  
  **方法**：

  查询合约是否实现了此接口

  **权限**：

  无,view方法

  **参数**：

  interfaceId： 方法id =  bytes4(keccak256('supportsInterface(bytes4)'))

  **返回**：

  bool值

<br>

- **TopProver.sol**

**1)bridgeLight()**

  **方法**：

  返回块头同步的合约

  **权限**：

  无,view方法

  **参数**：

  无

  **返回**：

  地址

<br>  

**2)getAddLightClientTime(uint64 height)**

  **方法**：

  返回同步块的同步时间

  **权限**：

  无,view方法

  **参数**：

  height：块高

  **返回**：

  时间戳（如果当前块高没有被同步直接报错"Height is not confirmed1"）

<br>

**3)verify(TopProofDecoder.Proof calldata proof, Deserialize.TransactionReceiptTrie calldata receipt, bytes32 receiptsRoot, bytes32 blockHash)**

  **方法**：

  验证解析之后的收据

  **权限**：

  无,view方法

  **参数**：

  proof：proof结构体

  receipt：receipt结构体

  receiptsRoot：数据的roothash

  blockHash：交易块的hash

  **返回**：

  valid：bool值（true则验证通过,false验证失败）

  reason：理由

<br>

- **Limit.sol**

**1)bindFrozen(address _asset, uint _frozenDuration)**

  **方法**：

  绑定资产的解锁时长

  **权限**：

  OWNER_ROLE（必须小于180天）

  **参数**：

  _asset：资产地址

  _frozenDuration：时间戳（秒）

<br>

**2)bindTransferedQuota(address _asset, uint256 _minTransferedToken, uint256 _maxTransferedToken)**

  **方法**：

  绑定资产的最大最小金额

  **权限**：

  OWNER_ROLE

  **参数**：

  _asset：资产地址

  _minTransferedToken：最小金额

  _maxTransferedToken：最大金额

<br>

**2)checkFrozen(address _asset, uint _timestamp)**

  **方法**：

  检查资产是否达到了解锁时长

  **权限**：

  无,view方法

  参数:

  _asset:资产

  _timestamp：交易的聚合块在同步合约里的时间戳（TopBridge里的blockHeights方法）

  **返回**：
  
  bool值

<br>  

**3)function checkTransferedQuota(address _asset,uint256 _amount)**

  **方法**：

  检查资产的对应金额是否满足最小最大金额

  如果不满足合约会直接抛异常

  **权限**：

  无
  
  **参数**：

  _asset：资产地址

  _amount：金额
  
<br>

**4)forbiddens(bytes32 _forbiddenId )**

  **方法**：

  查询收据是否在黑名单中

  **权限**：

  无,view方法

  **参数**：

  _forbiddenId：数据id

  **返回**：
  
  bool值（true则表示在还名单，false则表示不在）

<br>

**5)forbiden(bytes32 _forbiddenId)**

  **方法**：

  设置某收据为黑名单收据

  **权限**：

  FORBIDEN_ROLE角色

  **参数**：

  _forbiddenId：数据id

<br>

**6) getFrozen(address _asset)**

  **方法**：

  返回某一资产的解锁时长

  **权限**：

  无,view方法

  **参数**

  _asset:资产地址

  **返回**：

  时间戳

<br>  

**7)getRoleAdmin(bytes32 role)**

  **方法**：

  返回角色权限的admin

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  **返回**：

  role admin的bytes32

<br> 

**8) getTransferedQuota(address _asset)**

  **方法**：

  返回某一资产的锁定金额区间

  **权限**：

  无,view方法

  **返回**：
  
  最小金额和最大金额  

<br>

**9)grantRole(bytes32 role, address account)**

  **方法**：

  添加角色

  **权限**：

  角色的admin角色

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**10)hasRole(bytes32 role, address account)**

  **方法**：

  角色里是否存在此账户

  **权限**：

  无,view方法

  **参数**：

  role：角色的bytes32

  account：账户地址

  **返回**：

  bool值

<br>

**11)recover(bytes32 _forbiddenId)**

  **方法**：

  移除某收据为黑名单收据

  **权限**：

  FORBIDEN_ROLE角色

  **参数**：

  _forbiddenId：数据id

<br>

**12)renounceRole(bytes32 role, address account)**

  **方法**：

  放弃权限，原作用是移除自己在角色的权限，当前调用直接报错"not support"

  **参数**：

  role：角色的bytes32

  account：账户地址

<br>

**13)supportsInterface(bytes4 interfaceId)**
  
  **方法**：

  查询合约是否实现了此接口

  **权限**：

  无,view方法

  **参数**：

  interfaceId： 方法id =  bytes4(keccak256('supportsInterface(bytes4)'))

  **返回**：

  bool值

<br>

**14)tokenFrozens(address asset)**

  **方法**：

  返回某一资产的解锁时长

  **权限**：

  无,view方法

  **参数**：

  asset：资产地址

  **返回**：

  时间戳

<br>  

**15)tokenQuotas(address asset)**

  **方法**：

  返回某一资产的锁定金额区间

  **权限**：

  无,view方法

  **参数**：

  asset：资产地址

  **返回**：
  
  最小金额和最大金额  



  

