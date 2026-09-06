# Three-Tier Web Application Deployment on Kubernetes with GitOps

A production-grade, end-to-end cloud-native deployment of a full-stack web application on **AWS Elastic Kubernetes Service (EKS)**, implementing a complete DevOps lifecycle — from containerisation and cluster provisioning to stateful database management, GitOps-driven continuous delivery, and secure HTTPS routing via a custom domain.

---

## 📌 Project Overview

This project demonstrates the deployment of a **three-tier web application** using modern DevOps practices:

- **Presentation Tier** — React.js frontend, built into a static bundle and served via NGINX inside a Docker container
- **Logic Tier** — Node.js / Express.js REST API backend that handles business logic and communicates with the database
- **Data Tier** — MongoDB deployed as a Kubernetes StatefulSet with a 3-replica ReplicaSet and AWS EBS-backed Persistent Volumes for data durability

Each tier is independently containerised, deployed as a Kubernetes workload, and exposed only to the appropriate layer — following the **separation of concerns** principle that is fundamental to scalable, maintainable cloud architecture.

---

## 🏗️ Architecture Diagram

```
                        ┌─────────────────────────────────┐
                        │          AWS Cloud (VPC)         │
                        │                                  │
  User / Browser ──────►│  Route 53 (Custom Domain DNS)   │
                        │          │                       │
                        │          ▼                       │
                        │  AWS Application Load Balancer   │
                        │  (Internet-Facing ALB)           │
                        │          │                       │
                        │          ▼                       │
                        │  ┌───────────────────────────┐  │
                        │  │   Kubernetes (EKS Cluster) │  │
                        │  │                           │  │
                        │  │  NGINX Ingress (ALB)      │  │
                        │  │    /  ──► frontend-svc    │  │
                        │  │    /api ──► backend-svc   │  │
                        │  │                           │  │
                        │  │  ┌──────────┐             │  │
                        │  │  │ Frontend │ (2 Pods)    │  │
                        │  │  │ React +  │             │  │
                        │  │  │ NGINX    │             │  │
                        │  │  └──────────┘             │  │
                        │  │        │                  │  │
                        │  │  ┌──────────┐             │  │
                        │  │  │ Backend  │ (2 Pods)    │  │
                        │  │  │ Node.js  │             │  │
                        │  │  │ Express  │             │  │
                        │  │  └──────────┘             │  │
                        │  │        │                  │  │
                        │  │  ┌─────────────────────┐  │  │
                        │  │  │ MongoDB StatefulSet  │  │  │
                        │  │  │ mongo-0 (PRIMARY)    │  │  │
                        │  │  │ mongo-1 (SECONDARY)  │  │  │
                        │  │  │ mongo-2 (SECONDARY)  │  │  │
                        │  │  │ ReplicaSet rs0        │  │  │
                        │  │  │ EBS PVC (gp2)        │  │  │
                        │  │  └─────────────────────┘  │  │
                        │  └───────────────────────────┘  │
                        │                                  │
                        │  Argo CD (GitOps Controller)     │
                        │  Watches GitHub → Reconciles     │
                        └─────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Tool / Service | Role | Why It Was Chosen |
|---|---|---|
| **AWS EKS** | Managed Kubernetes control plane | Eliminates the overhead of managing the K8s control plane; integrates natively with AWS IAM, EBS, ALB, and Route 53 |
| **Kubernetes** | Container orchestration | Handles scheduling, self-healing, scaling, and service discovery for all application tiers |
| **Docker** | Application containerisation | Packages each tier with its exact dependencies, ensuring environment consistency from dev to production |
| **Argo CD** | GitOps continuous delivery | Treats the Git repository as the single source of truth; automatically reconciles cluster state to match declared manifests |
| **MongoDB** | NoSQL database | Deployed as a StatefulSet to leverage stable network identities required for ReplicaSet member discovery |
| **Helm** | Kubernetes package manager | Manages complex deployments (ALB Controller, Argo CD) with versioned, configurable chart releases |
| **AWS ALB** | Cloud load balancer | Distributes external HTTPS traffic to Kubernetes services with deep AWS integration |
| **NGINX** | Reverse proxy / static serving | Serves the compiled React build efficiently; acts as the ingress controller within the cluster |
| **AWS Route 53** | DNS management | Routes custom domain traffic to the ALB; enables HTTPS with a professional domain |
| **AWS EBS** | Block storage for MongoDB | Provides durable, persistent storage for MongoDB pods that survives pod restarts and rescheduling |
| **eksctl** | EKS cluster provisioner | CLI tool for declarative EKS cluster creation including node groups, OIDC, and add-ons |

---

## 📁 Repository Structure

```
3-Tier-WebApp-K8s-GitOps/
├── frontend/                   # React.js frontend application
│   ├── src/                    # React source code
│   ├── public/                 # Static assets
│   ├── nginx.conf              # Custom NGINX configuration
│   ├── Dockerfile              # Multi-stage build: Node → NGINX
│   └── package.json
│
├── backend/                    # Node.js/Express REST API
│   ├── server.js               # Express app with MongoDB connection
│   ├── Dockerfile              # Production Node.js image
│   └── package.json
│
├── k8s-http/                   # Kubernetes manifests (HTTP deployment)
│   ├── namespace.yml           # Isolated namespace: 3-tier-ns
│   ├── secrets.yaml            # MongoDB credentials (base64-encoded)
│   ├── mongo.yaml              # MongoDB StatefulSet + Headless Service
│   ├── mongo-init.yaml         # ReplicaSet initialisation Job
│   ├── backend.yaml            # Backend Deployment + ClusterIP Service
│   ├── frontend.yaml           # Frontend Deployment + ClusterIP Service
│   └── ingress.yaml            # ALB Ingress with path-based routing
│
└── k8s-https/                  # Kubernetes manifests (HTTPS deployment)
    ├── (same structure as k8s-http)
    └── ingress-443.yaml        # HTTPS/TLS ingress configuration
```

---

## ✅ Prerequisites

Before starting, ensure you have:

- An **AWS account** with appropriate IAM permissions (EC2, EKS, IAM, EBS, Route 53)
- A **registered domain name** (for Route 53 custom domain)
- A **Docker Hub account** (for pushing container images)
- **Git** installed locally

---

## 🚀 Step-by-Step Deployment Guide

---

### Phase 1: Prepare the Management Server

#### Step 1 — Launch an EC2 Instance (Management Server)

Create a `t2.micro` EC2 instance running **Ubuntu 22.04 LTS**. This acts as a dedicated management server from which all cluster operations are performed — keeping your local machine clean and ensuring consistent tooling versions.

Attach an **IAM role** to the EC2 instance with the following permissions:
- `IAMFullAccess`
- `AmazonEC2FullAccess`
- `AmazonVPCFullAccess`
- A custom EKS policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "eks:CreateCluster",
        "eks:DeleteCluster",
        "eks:DescribeCluster",
        "eks:ListClusters",
        "eks:DescribeNodegroup",
        "eks:ListNodegroups",
        "eks:AccessKubernetesApi"
      ],
      "Resource": "*"
    }
  ]
}
```

> **Why a dedicated EC2?** Running cluster management from a server inside the same AWS VPC reduces latency for API calls and avoids credential management on your local machine. The IAM role attached to the instance grants permissions without storing access keys on disk.

SSH into the instance from your local machine:
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

#### Step 2 — Configure AWS CLI

The AWS CLI is the primary interface for authenticating and interacting with AWS services programmatically.

**Install AWS CLI:**
```bash
sudo apt install -y unzip
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

**Configure with your credentials:**
```bash
aws configure
```
Enter your AWS Access Key ID, Secret Access Key, default region (`ap-south-1`), and output format (`json`).

> **Why configure AWS CLI?** All subsequent tools — `eksctl`, `kubectl` (via kubeconfig), and Helm charts — rely on the AWS CLI's credential chain to authenticate API calls to AWS. Without this, no AWS resource can be created or managed programmatically.

---

#### Step 3 — Install kubectl

`kubectl` is the official Kubernetes CLI. It communicates with the Kubernetes API server to apply manifests, inspect resources, and manage workloads.

```bash
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg git

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.33/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.33/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list

sudo apt-get update
sudo apt-get install -y kubectl bash-completion

# Enable auto-completion and alias for productivity
echo 'source <(kubectl completion bash)' >> ~/.bashrc
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -F __start_kubectl k' >> ~/.bashrc
source ~/.bashrc
```

Verify installation:
```bash
kubectl version --client
```

> **Why kubectl?** Every interaction with the Kubernetes cluster — applying manifests, checking pod status, debugging logs — goes through `kubectl`. It reads the `~/.kube/config` file to know which cluster to talk to and uses the AWS-issued authentication token to prove identity.

---

#### Step 4 — Install eksctl

`eksctl` is the official CLI for Amazon EKS, purpose-built to simplify cluster creation and management. It abstracts hundreds of lines of CloudFormation into a single command.

```bash
ARCH=amd64
PLATFORM=$(uname -s)_$ARCH

curl -sLO "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$PLATFORM.tar.gz"

# Verify checksum for security
curl -sL "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_checksums.txt" | grep $PLATFORM | sha256sum --check

tar -xzf eksctl_$PLATFORM.tar.gz -C /tmp && rm eksctl_$PLATFORM.tar.gz
sudo install -m 0755 /tmp/eksctl /usr/local/bin && rm /tmp/eksctl

# Enable auto-completion
echo 'source <(eksctl completion bash)' >> ~/.bashrc
echo 'alias e=eksctl' >> ~/.bashrc
source ~/.bashrc
```

Verify installation:
```bash
eksctl version
```

> **Why eksctl?** Creating an EKS cluster manually involves coordinating VPC setup, IAM roles, node group launch templates, and CloudFormation stacks. `eksctl` handles all of this declaratively and also manages the OIDC provider association needed for IAM Roles for Service Accounts (IRSA).

---

#### Step 5 — Install Helm

Helm is the de facto package manager for Kubernetes. It bundles complex multi-resource Kubernetes applications into reusable, versioned "charts."

```bash
sudo apt-get install curl gpg apt-transport-https --yes
curl -fsSL https://packages.buildkite.com/helm-linux/helm-debian/gpgkey | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/helm.gpg] https://packages.buildkite.com/helm-linux/helm-debian/any/ any main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm bash-completion

# Enable auto-completion
echo 'source <(helm completion bash)' >> ~/.bashrc
echo 'alias h=helm' >> ~/.bashrc
source ~/.bashrc
```

Verify installation:
```bash
helm version
```

> **Why Helm?** Tools like the AWS Load Balancer Controller and Argo CD consist of dozens of Kubernetes resources (Deployments, ClusterRoles, ServiceAccounts, CRDs, etc.). Helm installs all of these with a single command and allows configuration through values overrides — making upgrades, rollbacks, and configuration management far more maintainable than raw `kubectl apply`.

---

### Phase 2: Provision the EKS Cluster

#### Step 6 — Create the EKS Cluster and Node Group

This creates the Kubernetes cluster on AWS with a managed node group across multiple Availability Zones for high availability.

```bash
eksctl create cluster \
  --name my-cluster \
  --region ap-south-1 \
  --version 1.33 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 4 \
  --node-volume-size 20
```

> **What this provisions:**
> - A **managed Kubernetes control plane** (AWS runs the API server, etcd, and scheduler — you don't manage them)
> - **2 x `t3.medium` EC2 worker nodes** spread across Availability Zones for fault tolerance
> - Auto-scaling configured between 2 and 4 nodes to handle variable load
> - A **VPC with public and private subnets** across 3 AZs
> - The necessary **security groups, IAM roles, and networking** for node-to-control-plane communication
>
> This single command replaces what would otherwise require 20+ manual steps in the AWS Console.

---

### Phase 3: Configure AWS Add-ons and Controllers

#### Step 7 — Enable the OIDC Provider for IRSA

IAM Roles for Service Accounts (IRSA) allows Kubernetes pods to assume AWS IAM roles directly, without storing credentials inside the cluster. This requires an OIDC identity provider associated with the cluster.

```bash
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --approve \
  --region ap-south-1
```

> **Why OIDC?** Without OIDC, pods would need static AWS credentials injected as environment variables or secrets — a security anti-pattern. IRSA allows each component (EBS CSI driver, ALB Controller) to have its own fine-grained IAM role, following the **principle of least privilege**. A compromised pod can only access the exact AWS resources its role permits.

---

#### Step 8 — Install the AWS EBS CSI Driver (Dynamic Storage Provisioning)

The EBS CSI (Container Storage Interface) Driver allows Kubernetes to dynamically create, attach, and manage AWS EBS volumes for pods that request persistent storage.

**Create the IAM service account:**
```bash
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --role-only \
  --role-name AmazonEKS_EBS_CSI_Driver_Role \
  --region ap-south-1
```

**Install the EBS CSI Driver as an EKS add-on:**
```bash
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster my-cluster \
  --service-account-role-arn arn:aws:iam::<ACCOUNT_ID>:role/AmazonEKS_EBS_CSI_Driver_Role \
  --region ap-south-1 \
  --force
```

> **Why the EBS CSI Driver?** MongoDB is a stateful application — its data must survive pod restarts, node failures, and rescheduling. The EBS CSI Driver enables Kubernetes `PersistentVolumeClaims` to automatically provision dedicated EBS volumes. Without it, any pod restart would cause data loss. The `gp2` StorageClass used in this project provisions SSD-backed EBS volumes — one per MongoDB replica — ensuring each pod has its own isolated, durable storage.

---

#### Step 9 — Install the AWS Load Balancer Controller

The AWS Load Balancer Controller is a Kubernetes controller that watches for `Ingress` resources and automatically provisions and configures AWS Application Load Balancers (ALBs) to route traffic into the cluster.

**Create the IAM policy:**
```bash
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.13.3/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json
```

**Create the IAM service account:**
```bash
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::<ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --region ap-south-1 \
  --approve
```

**Install via Helm:**
```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=ap-south-1 \
  --version 1.13.3
```

**Verify the controller is running:**
```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```

> **Why the ALB Controller?** A standard Kubernetes Ingress only handles internal routing. The ALB Controller bridges Kubernetes and AWS — it reads your `Ingress` YAML and translates it into a real AWS ALB with listener rules, target groups, and health checks. When a new Ingress resource is applied to the cluster, the controller automatically creates and configures the ALB within seconds, without any manual AWS Console work.

---

#### Step 10 — Update kubeconfig

Connect `kubectl` on your management server to the newly created EKS cluster:

```bash
aws eks update-kubeconfig --name my-cluster --region ap-south-1
```

**Verify cluster connectivity:**
```bash
kubectl get nodes
```

> **Why update kubeconfig?** The `~/.kube/config` file tells `kubectl` which cluster to communicate with and how to authenticate. `aws eks update-kubeconfig` writes the cluster endpoint, CA certificate, and AWS authentication configuration into this file. After this step, every `kubectl` command targets the EKS cluster, authenticated using the IAM identity of the EC2 instance.

---

### Phase 4: Containerise and Push Application Images

#### Step 11 — Build and Push Docker Images

Clone this repository and build both application images.

**Backend (Node.js API):**

The backend `Dockerfile` uses a minimal `node:16-alpine` base image and installs only production dependencies:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**Frontend (React + NGINX):**

The frontend uses a **multi-stage Docker build** — the first stage compiles the React application, and the second stage copies only the compiled static files into a lightweight NGINX image:

```dockerfile
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and push both images:
```bash
# Backend
cd backend
docker build -t <your-dockerhub-username>/3-tier-backend:latest .
docker push <your-dockerhub-username>/3-tier-backend:latest

# Frontend
cd ../frontend
docker build -t <your-dockerhub-username>/3-tier-frontend:latest .
docker push <your-dockerhub-username>/3-tier-frontend:latest
```

Update the image field in `k8s-http/backend.yaml` and `k8s-http/frontend.yaml` with your Docker Hub username.

> **Why multi-stage builds for the frontend?** A single-stage frontend build would include the entire Node.js runtime, `node_modules`, and build tools in the final image — resulting in an image of 800MB+. The multi-stage approach discards all build-time dependencies and only keeps the compiled HTML/CSS/JS files served by the lightweight `nginx:alpine` image (~23MB). This reduces attack surface, speeds up image pulls, and lowers egress costs.

---

### Phase 5: Deploy the Application to Kubernetes

#### Step 12 — Create the Application Namespace

Kubernetes namespaces provide a logical partition within the cluster. All application resources are isolated within `3-tier-ns`, preventing accidental interference with system components.

```bash
kubectl apply -f k8s-http/namespace.yml
```

Set this namespace as the default context:
```bash
kubectl config set-context --current --namespace 3-tier-ns
```

> **Why namespaces?** In a production EKS cluster running multiple applications, namespaces enforce resource isolation, enable per-namespace RBAC policies, and allow resource quotas to be applied per application. Keeping all three tiers in one namespace (`3-tier-ns`) simplifies inter-service DNS resolution while still isolating from cluster-level components.

---

#### Step 13 — Create Kubernetes Secrets

Credentials for the MongoDB database are stored as Kubernetes Secrets — not hardcoded in environment variables or ConfigMaps.

```bash
kubectl apply -f k8s-http/secrets.yaml
```

The `secrets.yaml` stores the username and password as base64-encoded values:
```yaml
apiVersion: v1
kind: Secret
metadata:
  namespace: 3-tier-ns
  name: mongo-sec
type: Opaque
data:
  password: <base64-encoded-password>
  username: <base64-encoded-username>
```

> **Why Kubernetes Secrets?** Storing credentials directly in YAML manifests or environment variables exposes them in Git history and process listings. Kubernetes Secrets are stored in `etcd` (encrypted at rest in EKS), accessed only by pods with explicit references, and can be integrated with AWS Secrets Manager for rotation in production environments.

---

#### Step 14 — Deploy MongoDB StatefulSet

MongoDB is deployed as a **Kubernetes StatefulSet** with 3 replicas forming a **ReplicaSet** — the foundation of MongoDB's high-availability architecture.

```bash
kubectl apply -f k8s-http/mongo.yaml
kubectl apply -f k8s-http/mongo-init.yaml
```

**What `mongo.yaml` creates:**

- A `StatefulSet` with 3 pods: `mongo-0`, `mongo-1`, `mongo-2`
- A **Headless Service** (`clusterIP: None`) that enables stable DNS for each pod: `mongo-0.mongo`, `mongo-1.mongo`, `mongo-2.mongo`
- A `volumeClaimTemplate` that instructs the EBS CSI Driver to automatically create a dedicated `1Gi gp2` EBS volume for each pod

**What `mongo-init.yaml` does:**

This is a Kubernetes `Job` that runs after the StatefulSet is ready (via Argo CD sync wave annotation). It waits for `mongo-0` to be reachable, then initialises the ReplicaSet:

```javascript
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo-0.mongo:27017' },
    { _id: 1, host: 'mongo-1.mongo:27017' },
    { _id: 2, host: 'mongo-2.mongo:27017' }
  ]
})
```

**Verify the StatefulSet and Persistent Volumes:**
```bash
kubectl get statefulset -n 3-tier-ns
kubectl get pvc -n 3-tier-ns
kubectl get pv
```

> **Why StatefulSet instead of Deployment?**
> MongoDB requires stable, predictable pod identities for ReplicaSet membership. A `Deployment` creates pods with random names (e.g., `mongo-abc123`) that change on restart, breaking ReplicaSet configuration. A `StatefulSet` guarantees:
> - **Stable pod names**: `mongo-0`, `mongo-1`, `mongo-2` — always the same
> - **Ordered startup**: pods start and terminate in sequence, ensuring `mongo-0` (PRIMARY) is always available before secondaries join
> - **Persistent storage binding**: each pod always re-attaches to its own EBS volume after restart
>
> **Why a ReplicaSet?** A 3-member ReplicaSet means that if one MongoDB pod crashes or its node fails, a **SECONDARY automatically promotes to PRIMARY** within seconds — maintaining database availability without manual intervention. This is the fundamental high-availability mechanism for MongoDB in production.

---

#### Step 15 — Deploy the Backend API

```bash
kubectl apply -f k8s-http/backend.yaml
```

This creates:
- A **Deployment** with 2 replicas of the Node.js API pod
- A **ClusterIP Service** (`backend-svc`) exposing port 3000 — accessible only within the cluster

The backend deployment includes:
- **Resource requests and limits**: prevents a runaway pod from starving other workloads
- **Liveness probe**: Kubernetes calls `GET /health` every 10 seconds; if it fails 3 times, the pod is restarted automatically
- **Readiness probe**: Kubernetes only sends traffic to the pod once `GET /health` returns 200; prevents requests reaching a pod that's still initialising its MongoDB connection

```bash
kubectl get deployment backend -n 3-tier-ns
kubectl get pods -n 3-tier-ns -l app=backend
```

> **Why liveness and readiness probes?** Without probes, Kubernetes considers a pod "ready" the moment its container starts — even if the application is still booting or the database connection is being established. With probes, Kubernetes achieves **zero-downtime rolling updates**: new pods are only added to the load balancer after they pass readiness checks, and old pods are only terminated after the new ones are healthy.

---

#### Step 16 — Deploy the Frontend

```bash
kubectl apply -f k8s-http/frontend.yaml
```

This creates:
- A **Deployment** with 2 replicas of the React + NGINX pod
- A **ClusterIP Service** (`frontend-svc`) exposing port 80 — internal only

The NGINX server is configured with a custom `nginx.conf` that:
- Serves the React build from `/usr/share/nginx/html`
- Handles SPA routing with `try_files $uri $uri/ /index.html` (prevents 404 on browser refresh)
- Proxies `/api/` requests to the backend service

```bash
kubectl get deployment frontend-deployment -n 3-tier-ns
```

---

#### Step 17 — Configure Ingress (Path-Based Routing)

The Ingress resource defines how external traffic is routed to internal services. The ALB Controller reads this resource and provisions a real AWS ALB.

```bash
kubectl apply -f k8s-http/ingress.yaml
```

The ingress routes:
- `/*` → `frontend-svc:80` (serves the React UI)
- `/api/*` → `backend-svc:3000` (REST API calls)
- `/health` → `backend-svc:3000` (ALB health check endpoint)

```bash
kubectl get ingress -n 3-tier-ns
```

Copy the **ALB DNS address** from the `ADDRESS` field — the application is now accessible via the internet.

> **Why path-based routing?** Rather than running a separate load balancer for each service (and paying for each), a single ALB handles all traffic and routes to the appropriate service based on the URL path. This is a cost-efficient, production-standard pattern. The frontend and backend have clean URL separation, and the health check endpoint lets the ALB automatically remove unhealthy targets without manual intervention.

---

### Phase 6: Implement GitOps with Argo CD

#### Step 18 — Install Argo CD on the EKS Cluster

Argo CD is a declarative GitOps continuous delivery tool. It runs inside the cluster and continuously compares the cluster's live state against the desired state declared in a Git repository.

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

kubectl create namespace argocd
helm install argocd argo/argo-cd --namespace argocd

kubectl get all -n argocd
```

**Expose the Argo CD server via a Load Balancer:**
```bash
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
```

**Get the Argo CD UI URL:**
```bash
kubectl get svc argocd-server -n argocd -o json | jq --raw-output '.status.loadBalancer.ingress[0].hostname'
```

**Retrieve the initial admin password:**
```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

Login at the ALB URL with username `admin` and the decoded password.

> **Why Argo CD?** Without GitOps, deployments are done manually with `kubectl apply` — commands run on someone's laptop that leave no audit trail and can't be easily reproduced or rolled back. With Argo CD:
> - The **Git repository is the single source of truth** — what's in Git is what should be in the cluster
> - **Every change is version-controlled and auditable** — who changed what, when, and why
> - **Automatic reconciliation** — if someone manually edits a resource in the cluster (drift), Argo CD detects it and reverts to the Git state
> - **One-click rollback** — reverting a bad deployment is a Git revert, not a cluster emergency

---

#### Step 19 — Create the Argo CD Application

In the Argo CD UI:

1. Click **"New App"**
2. Set **Application Name**: `3-tier-app`
3. Set **Project**: `default`
4. Set **Sync Policy**: `Automatic` (with `Self Heal` and `Prune` enabled)
5. Set **Repository URL**: `https://github.com/<your-username>/3-Tier-WebApp-K8s-GitOps`
6. Set **Path**: `k8s-http` (or `k8s-https` for HTTPS)
7. Set **Cluster URL**: `https://kubernetes.default.svc`
8. Set **Namespace**: `3-tier-ns`
9. Click **Create**

Argo CD will immediately sync the repository and deploy all manifests in the `k8s-http/` directory in dependency order (respecting sync wave annotations on MongoDB resources).

> **Sync Waves** (`argocd.argoproj.io/sync-wave`) are configured on MongoDB resources to ensure deployment order: the namespace and secrets are created first (wave 0), then the StatefulSet (wave 1), then the ReplicaSet init Job (wave 2), and finally the application tier.

---

### Phase 7: Configure Custom Domain with HTTPS

#### Step 20 — Configure AWS Route 53

1. Navigate to **Route 53** in the AWS Console
2. Select your **Hosted Zone** for your registered domain
3. Create an **A Record** (Alias):
   - **Record name**: your subdomain (e.g., `app.yourdomain.com`)
   - **Alias target**: select the **ALB DNS name** from the Ingress output
4. Save the record

**Switch to HTTPS ingress:**
```bash
kubectl apply -f k8s-https/ingress-443.yaml
```

> **Why Route 53?** AWS Route 53 integrates natively with AWS ALB via Alias records — no extra charge for DNS queries to Alias records. Using a custom domain instead of a raw ALB hostname is a professional best practice, enables HTTPS with a valid certificate, and provides a stable URL that doesn't change when infrastructure is recreated.

---

### Phase 8: Verify the Deployment

#### Full Deployment Verification Checklist

```bash
# Cluster nodes
kubectl get nodes

# All resources in the application namespace
kubectl get all -n 3-tier-ns

# Persistent Volumes (confirms dynamic EBS provisioning)
kubectl get pvc -n 3-tier-ns
kubectl get pv

# Ingress (get ALB DNS address)
kubectl get ingress -n 3-tier-ns

# Argo CD application sync status
kubectl get applications -n argocd

# Application health check
curl http://<ALB_DNS>/health
```

Expected health check response:
```json
{
  "status": "OK",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "database": "connected"
}
```

---

### Phase 9: Cleanup (Delete Resources)

When the project is complete, delete all resources to avoid ongoing AWS charges:

```bash
# Delete Kubernetes resources
kubectl delete namespace 3-tier-ns
kubectl delete namespace argocd

# Delete the EKS cluster and all associated infrastructure
eksctl delete cluster --name my-cluster --region ap-south-1
```

> **Important:** `eksctl delete cluster` automatically removes the VPC, node groups, and CloudFormation stacks. However, **manually verify** in the AWS Console that all EBS volumes (PVs) and the ALB have been deleted — these may persist if the Kubernetes resources referencing them were deleted before the controllers could clean them up.

---

## 🔑 Key DevOps Concepts Demonstrated

| Concept | Implementation in This Project |
|---|---|
| **Infrastructure as Code** | All AWS infrastructure provisioned with `eksctl` commands; all Kubernetes resources declared as YAML manifests |
| **GitOps** | Argo CD continuously reconciles cluster state to Git — Git is the source of truth, not kubectl commands |
| **High Availability** | 2 frontend replicas, 2 backend replicas, 3-node MongoDB ReplicaSet across multiple AZs |
| **Stateful Workloads** | MongoDB StatefulSet with dynamic PVC provisioning using AWS EBS CSI Driver |
| **Least-Privilege Security** | Per-component IAM roles via IRSA; Kubernetes Secrets for credentials; ClusterIP services for internal communication |
| **Zero-Downtime Deployments** | Liveness and readiness probes ensure traffic only routes to healthy pods during rolling updates |
| **Multi-Stage Docker Builds** | Frontend image stripped of build tools; final image is ~23MB NGINX serving static assets |
| **Path-Based Ingress Routing** | Single ALB routes to multiple services based on URL prefix — cost-efficient and production-standard |
| **Namespace Isolation** | Application resources isolated in `3-tier-ns`; cluster-level tooling in `kube-system` and `argocd` |
| **Automated Self-Healing** | Kubernetes restarts failed pods; Argo CD reverts manual cluster changes; MongoDB promotes a new PRIMARY automatically |

---

## 📚 References

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/latest/userguide/)
- [eksctl Documentation](https://eksctl.io/)
- [Argo CD Documentation](https://argo-cd.readthedocs.io/)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/)
- [AWS EBS CSI Driver](https://github.com/kubernetes-sigs/aws-ebs-csi-driver)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [MongoDB Replica Set](https://www.mongodb.com/docs/manual/replication/)

---

## 👤 Author

**Isuru Indrajith**
- GitHub: [github.com/IsuruIndrajith](https://github.com/IsuruIndrajith)
- LinkedIn: [linkedin.com/in/isuru-indrajith](https://www.linkedin.com/in/isuru-indrajith-387ab7278/)
