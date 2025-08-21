# Production Deployment Guide

This guide explains how to deploy the PDF Transaction Extractor as a production website with proper security, monitoring, and scalability.

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh

# Windows
deploy.bat
```

### Option 2: Manual Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=production
export SECRET_KEY=$(openssl rand -hex 32)

# Run with Gunicorn
gunicorn --config gunicorn.conf.py wsgi:application
```

## 🌐 Production Website Setup

### 1. **Domain Configuration**

1. **Purchase a domain** (e.g., from Namecheap, GoDaddy, or Google Domains)
2. **Configure DNS** to point to your server IP
3. **Set up SSL certificate** using Let's Encrypt or your hosting provider

### 2. **Server Requirements**

- **CPU**: 2+ cores (4+ recommended for OCR processing)
- **RAM**: 4GB+ (8GB+ recommended)
- **Storage**: 20GB+ SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

### 3. **Cloud Deployment Options**

#### A. **AWS EC2**
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx

# Connect and deploy
ssh -i your-key.pem ubuntu@your-instance-ip
git clone your-repo
cd pdf-transaction-extractor
./deploy.sh
```

#### B. **Google Cloud Platform**
```bash
# Create VM instance
gcloud compute instances create pdf-extractor \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud

# Deploy
gcloud compute ssh pdf-extractor
git clone your-repo
cd pdf-transaction-extractor
./deploy.sh
```

#### C. **DigitalOcean**
```bash
# Create droplet
doctl compute droplet create pdf-extractor \
  --size s-2vcpu-4gb \
  --image ubuntu-20-04-x64 \
  --region nyc1

# Deploy
ssh root@your-droplet-ip
git clone your-repo
cd pdf-transaction-extractor
./deploy.sh
```

## 🔒 Security Configuration

### 1. **Environment Variables**

Create a `.env` file with secure values:

```bash
# Required
SECRET_KEY=your-super-secret-key-here
FLASK_ENV=production

# Optional: Cloud OCR APIs
GOOGLE_VISION_API_KEY=your-google-vision-api-key
AZURE_VISION_KEY=your-azure-vision-key
AZURE_VISION_ENDPOINT=your-azure-vision-endpoint

# Optional: Monitoring
GRAFANA_PASSWORD=secure-password-here
```

### 2. **SSL Certificate**

#### Using Let's Encrypt (Free):
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
```

#### Using Commercial Certificate:
```bash
# Copy your certificate files
cp your-certificate.crt ssl/cert.pem
cp your-private-key.key ssl/key.pem
```

### 3. **Firewall Configuration**

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Or iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## 📊 Monitoring & Logging

### 1. **Application Monitoring**

The deployment includes:
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards
- **Health checks**: Application status monitoring

### 2. **Log Management**

```bash
# View application logs
docker-compose logs -f app

# View Nginx logs
docker-compose logs -f nginx

# View all logs
docker-compose logs -f
```

### 3. **Performance Monitoring**

Access monitoring dashboards:
- **Grafana**: http://yourdomain.com:3000
- **Prometheus**: http://yourdomain.com:9090

## 🔧 Configuration Options

### 1. **Nginx Configuration**

Edit `nginx.conf` for custom settings:

```nginx
# Custom domain
server_name yourdomain.com www.yourdomain.com;

# Custom SSL certificate path
ssl_certificate /path/to/your/cert.pem;
ssl_certificate_key /path/to/your/key.pem;

# Custom rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
```

### 2. **Application Configuration**

Edit `production_config.py` for application settings:

```python
# Adjust file upload limits
MAX_CONTENT_LENGTH = 64 * 1024 * 1024  # 64MB

# Adjust rate limiting
RATELIMIT_DEFAULT = "50 per hour"

# Enable cloud storage
CLOUD_STORAGE_ENABLED = True
```

### 3. **Docker Configuration**

Edit `docker-compose.yml` for container settings:

```yaml
# Adjust resource limits
app:
  deploy:
    resources:
      limits:
        memory: 4G
        cpus: '2.0'
      reservations:
        memory: 2G
        cpus: '1.0'
```

## 🚀 Scaling Options

### 1. **Horizontal Scaling**

```yaml
# docker-compose.yml
app:
  deploy:
    replicas: 3
    update_config:
      parallelism: 1
      delay: 10s
```

### 2. **Load Balancing**

```nginx
# nginx.conf
upstream flask_app {
    server app1:8000;
    server app2:8000;
    server app3:8000;
}
```

### 3. **Database Scaling**

```yaml
# Add PostgreSQL for session storage
postgres:
  image: postgres:13
  environment:
    POSTGRES_DB: pdf_extractor
    POSTGRES_USER: app
    POSTGRES_PASSWORD: secure_password
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

## 🔄 Maintenance

### 1. **Updates**

```bash
# Update application
git pull origin main
docker-compose up -d --build

# Update SSL certificate (Let's Encrypt)
sudo certbot renew
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
docker-compose restart nginx
```

### 2. **Backups**

```bash
# Backup uploads
tar -czf backup-$(date +%Y%m%d).tar.gz uploads/

# Backup database (if using)
docker-compose exec postgres pg_dump -U app pdf_extractor > backup.sql
```

### 3. **Monitoring**

```bash
# Check application status
curl -f https://yourdomain.com/health

# Check container status
docker-compose ps

# Monitor resource usage
docker stats
```

## 🆘 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   docker-compose logs app
   
   # Check dependencies
   docker-compose exec app python -c "import pytesseract; print('OK')"
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate validity
   openssl x509 -in ssl/cert.pem -text -noout
   
   # Test SSL connection
   openssl s_client -connect yourdomain.com:443
   ```

3. **OCR not working**
   ```bash
   # Check Tesseract installation
   docker-compose exec app tesseract --version
   
   # Test OCR
   docker-compose exec app python -c "import pytesseract; print(pytesseract.get_languages())"
   ```

### Performance Issues

1. **Slow OCR processing**
   - Increase worker processes in `gunicorn.conf.py`
   - Enable GPU acceleration if available
   - Use cloud OCR APIs for better performance

2. **High memory usage**
   - Reduce worker count
   - Implement file cleanup
   - Use streaming for large files

## 📞 Support

For issues and questions:
1. Check application logs: `docker-compose logs -f`
2. Review monitoring dashboards
3. Check health endpoint: `https://yourdomain.com/health`
4. Verify SSL certificate: `https://www.ssllabs.com/ssltest/`

## 🔮 Future Enhancements

1. **CDN Integration**: Use CloudFlare or AWS CloudFront
2. **Auto-scaling**: Implement Kubernetes deployment
3. **Multi-region**: Deploy to multiple geographic locations
4. **Advanced monitoring**: Add APM tools like New Relic or DataDog
