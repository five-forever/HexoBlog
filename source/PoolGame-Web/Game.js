/*
 * @Author: Talos--1660327787@qq.com
 * @Date: 2023-12-03 20:52:28
 * @LastEditors: Talos--1660327787@qq.com
 * @LastEditTime: 2023-12-08 13:32:32
 * @FilePath: /PoolGame-Web/Game.js
 * @Description: 整个游戏世界的创建，
 * 
 * Copyright (c) 2023 by five-forever, All Rights Reserved. 
 */

import * as THREE from './libs/three137/three.module.js';
import * as CANNON from './libs/cannon-es.js';
import { RGBELoader } from './libs/three137/RGBELoader.js';
import { GLTFLoader } from './libs/three137/GLTFLoader.js';
import { OrbitControls } from './libs/three137/OrbitControls.js';
import { CannonHelper } from './libs/CannonHelper.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { Ball } from './Ball.js';
import { WhiteBall } from './WhiteBall.js';
import { Table } from './Table.js';
import { GameState } from './GameState.js';

class Game{
	constructor(){
        this.initThree();
        this.initWorld();
        this.initScene();

        this.gameState = new GameState(this);

        if (this.helper) this.helper.wireframe = true;
    }

    initThree(){
		const container = document.createElement('div');
		document.body.appendChild(container);
        
        this.debug = false;
        this.loadingBar = new LoadingBar();
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        // 添加环境光
		const ambient = new THREE.HemisphereLight(0x0d0d0d, 0x020202, 0.01);
		this.scene.add(ambient);
        // 添加点光源
        this.createLight(Table.LENGTH / 4);
        this.createLight(-Table.LENGTH / 4);
  		// threejs渲染器
		this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.shadowMap.enabled = true;
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.physicallyCorrectLights = true;
        container.appendChild(this.renderer.domElement);
        // 相机
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20);
		this.camera.position.set(-3, 1.5, 0);
        // 相机控制
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.minDistance = 0.35;
        this.controls.maxDistance = 1.65;
        this.controls.maxPolarAngle = 0.49 * Math.PI; // 限制相机仰角（从下往上看的角度）
          
        window.addEventListener('resize', this.resize.bind(this));
	}	
    // 创建点光源并添加到场景中
    createLight(x, debug=false){
        const spotlight = new THREE.SpotLight(0xffffe5, 2.5, 10, 0.8, 0.5, 2);
          
        spotlight.position.set(x, 1.5, 0);
        spotlight.target.position.set(x, 0, 0); //垂直照射xz平面
        spotlight.target.updateMatrixWorld();
          
        spotlight.castShadow = true;
        spotlight.shadow.camera.fov = 70;
        spotlight.shadow.camera.near = 1;
        spotlight.shadow.camera.far = 2.5;
        spotlight.shadow.mapSize.width = 2048;
        spotlight.shadow.mapSize.height = 2048;
          
        this.scene.add(spotlight);

        if (debug){
            const spotLightHelper = new THREE.SpotLightHelper(spotlight);
            this.scene.add(spotLightHelper);
        }
    }
    // 开局摆球复位
    reset(){
        this.balls.forEach(ball => ball.reset());
    }
    // 球杆击打白球
    strikeCueball(strength){
        this.cueball.hit(strength);
    }
    // 创建物理世界
    initWorld(){
        const w = new CANNON.World();

        w.gravity.set(0, -9.82, 0); // m/s²
        w.solver.iterations = 10; // 物理计算迭代次数
        w.solver.tolerance = 0; // 强制求解器使用所有迭代
        w.allowSleep = true;
        w.fixedTimeStep = 1.0 / 60.0; // 60帧
    
        this.setCollisionBehaviour(w);

        if(this.debug) this.helper = new CannonHelper(this.scene, w);

        this.world = w;
    }
    // 具体设置碰撞参数
    setCollisionBehaviour(world) {
        world.defaultContactMaterial.friction = 0.2; //摩擦力
        world.defaultContactMaterial.restitution = 0.8; //弹性
        // 桌布
        const ball_floor = new CANNON.ContactMaterial(
          Ball.MATERIAL,
          Table.FLOOR_MATERIAL,
          {friction: 0.7, restitution: 0.1}
        );
        // 库边
        const ball_wall = new CANNON.ContactMaterial(
          Ball.MATERIAL,
          Table.WALL_MATERIAL,
          {friction: 0.5, restitution: 0.6}
        );
        world.addContactMaterial(ball_floor);
        world.addContactMaterial(ball_wall);
      }
    // 初始化场景
    initScene(){
        this.setEnvironment();
        this.table = new Table(this);
        this.loadGLTF();
        this.createBalls();
    }
    // 加载环境贴图
    setEnvironment(){
        const loader = new RGBELoader();
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        
        loader.load( './assets/hdr/living_room.hdr',  
            texture => {
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                pmremGenerator.dispose();
                this.scene.environment = envMap;
            }, 
            undefined, 
            err => console.error(err)
         );
    }
    // 加载GLTF文件
    loadGLTF(){
        const loader = new GLTFLoader().setPath('./assets/pool-table/');
        
		loader.load(
			'pool-table-old.glb',
			// 加载成功后回调函数
			gltf => {
                this.table = gltf.scene;
                this.table.position.set(-Table.LENGTH/2, 0, Table.WIDTH/2)
                this.table.traverse(child => {
                    if (child.name == 'Cue'){
                        this.cue = child;
                        child.visible = false;
                    }
                    if (child.name == 'Felt'){
                        this.edges = child;
                    }
                    if (child.isMesh){
                        child.material.metalness = 0.0;
                        child.material.roughness = 0.3;
                    }
                    if (child.parent !== null && child.parent.name !== null && child.parent.name == 'Felt'){
                        child.material.roughness = 0.8;
                        child.receiveShadow = true;
                    }
                })
				this.scene.add(gltf.scene);
                this.loadingBar.visible = false;
                this.gameState.showPlayBtn();
				this.renderer.setAnimationLoop(this.render.bind(this)); // 绑定渲染函数
			},
			// 加载中进度条
			xhr => {
				this.loadingBar.progress = (xhr.loaded / xhr.total);
			},
			err => {
				console.error(err);
			}  
        );
    }
    // 创建0到14台球
    createBalls(){
        this.balls = [new WhiteBall(this, -Table.LENGTH/4, 0)];
        // 开局摆盘
        const rowInc = 1.74 * Ball.RADIUS;
        let row = {x:Table.LENGTH/4+rowInc, count:6, total:6};
        const ids = [4,3,14,2,15,13,7,12,5,6,8,9,10,11,1];
        // 按行加载
        for(let i=0; i<15; i++){
            if (row.total==row.count){
                row.total = 0;
                row.count--;
                row.x -= rowInc;
                row.z = (row.count-1) * (Ball.RADIUS + 0.002);
            }
            this.balls.push( new Ball(this, row.x, row.z, ids[i]));
            row.z -= 2 * (Ball.RADIUS + 0.002);
            row.total++;
        }
        // 0号为白球
        this.cueball = this.balls[0];
    }
    // 监听正常落袋和白球落袋事件
    updateUI(evt){
        switch(evt.event){
            case 'balldrop':
                this.gameState.coloredBallEnteredHole(evt.id);
                break;
            case 'whitedrop':
                this.gameState.whiteBallEnteredHole();
                break;
        }
    }
    // 适应浏览器窗口大小
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);  
    }
    // 渲染函数
	render(){   
        this.controls.target.copy(this.cueball.mesh.position);
        this.controls.update();
        if (this.helper) this.helper.update();
        this.gameState.update();
        this.world.step(this.world.fixedTimeStep);
        this.balls.forEach(ball => ball.update());
        this.renderer.render(this.scene, this.camera);
    }
}

export { Game };